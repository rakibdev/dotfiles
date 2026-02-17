import {
  type ModelDef,
  type Model,
  type Context,
  type AssistantMessageEventStream,
  type ImageContent,
} from 'coder/api'
import { createAssistantMessageEventStream, calculateCost, type Tool, type AssistantMessage } from 'coder/node_modules/@mariozechner/pi-ai'
import { createSdkMcpServer, query, type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk'
import type { Base64ImageSource, ContentBlockParam, MessageParam } from '@anthropic-ai/sdk/resources'
import { pascalCase } from 'change-case'

const PI_TO_SDK: Record<string, string> = {
  read: 'Read', write: 'Write', edit: 'Edit',
  bash: 'Bash', grep: 'Grep', find: 'Glob', glob: 'Glob',
}

const SDK_TO_PI: Record<string, string> = {
  read: 'read', write: 'write', edit: 'edit',
  bash: 'bash', grep: 'grep', glob: 'find',
}

const BUILTIN_NAMES = new Set(Object.keys(PI_TO_SDK))
const MCP_PREFIX = 'mcp__custom__'
const DENIED_MSG = 'Tool execution is unavailable in this environment.'

const SPOOF_PREFIX = `You are Claude Code, Anthropic's official CLI for Claude. You are an expert coding assistant.`

const piToSdk = (name?: string, custom?: Map<string, string>) => {
  if (!name) return ''
  const n = name.toLowerCase()
  return custom?.get(name) ?? custom?.get(n) ?? PI_TO_SDK[n] ?? pascalCase(name)
}

const sdkToPi = (name: string, custom?: Map<string, string>) => {
  const n = name.toLowerCase()
  return SDK_TO_PI[n] ?? custom?.get(name) ?? custom?.get(n) ?? (n.startsWith(MCP_PREFIX) ? name.slice(MCP_PREFIX.length) : name)
}

const contentToText = (content: any, custom?: Map<string, string>): string => {
  if (typeof content == 'string') return content
  if (!Array.isArray(content)) return ''
  return content.map((b: any) => {
    if (b.type == 'text') return b.text ?? ''
    if (b.type == 'thinking') return b.thinking ?? ''
    if (b.type == 'toolCall') return `Historical tool call: ${piToSdk(b.name, custom)} args=${JSON.stringify(b.arguments ?? {})}`
    return `[${b.type}]`
  }).join('\n')
}

const buildPrompt = (ctx: Context, custom?: Map<string, string>): ContentBlockParam[] => {
  const blocks: ContentBlockParam[] = []

  for (const msg of ctx.messages) {
    if (msg.role == 'user') {
      blocks.push({ type: 'text', text: `${blocks.length ? '\n\n' : ''}USER:\n` })
      if (typeof msg.content == 'string') {
        if (msg.content.length) blocks.push({ type: 'text', text: msg.content })
      } else if (Array.isArray(msg.content)) {
        let hasText = false
        for (const b of msg.content) {
          if (b.type == 'text') { blocks.push({ type: 'text', text: b.text ?? '' }); if ((b.text ?? '').trim()) hasText = true }
          else if (b.type == 'image') blocks.push({ type: 'image', source: { type: 'base64', media_type: (b as ImageContent).mimeType as Base64ImageSource['media_type'], data: (b as ImageContent).data } })
        }
        if (!hasText) blocks.push({ type: 'text', text: '(see attached image)' })
      }
    } else if (msg.role == 'assistant') {
      const text = contentToText(msg.content, custom)
      if (text.length) {
        blocks.push({ type: 'text', text: `${blocks.length ? '\n\n' : ''}ASSISTANT:\n` })
        blocks.push({ type: 'text', text })
      }
    } else if (msg.role == 'toolResult') {
      blocks.push({ type: 'text', text: `${blocks.length ? '\n\n' : ''}TOOL RESULT (historical ${piToSdk(msg.toolName, custom)}):\n` })
      if (typeof msg.content == 'string') {
        blocks.push({ type: 'text', text: msg.content })
      } else if (Array.isArray(msg.content)) {
        let hasText = false
        for (const b of msg.content) {
          if (b.type == 'text') { blocks.push({ type: 'text', text: b.text ?? '' }); if ((b.text ?? '').trim()) hasText = true }
          else if (b.type == 'image') blocks.push({ type: 'image', source: { type: 'base64', media_type: (b as ImageContent).mimeType as Base64ImageSource['media_type'], data: (b as ImageContent).data } })
        }
        if (!hasText) blocks.push({ type: 'text', text: '(see attached image)' })
      }
    }
  }

  return blocks.length ? blocks : [{ type: 'text', text: '' }]
}

const resolveTools = (ctx: Context) => {
  const sdkTools = new Set<string>()
  const customTools: Tool[] = []
  const toSdk = new Map<string, string>()
  const toPi = new Map<string, string>()

  if (!ctx.tools) return { sdkTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob'], customTools, toSdk, toPi }

  for (const tool of ctx.tools) {
    const n = tool.name.toLowerCase()
    if (BUILTIN_NAMES.has(n)) { sdkTools.add(PI_TO_SDK[n]); continue }
    const sdk = `${MCP_PREFIX}${tool.name}`
    customTools.push(tool)
    toSdk.set(tool.name, sdk); toSdk.set(n, sdk)
    toPi.set(sdk, tool.name); toPi.set(sdk.toLowerCase(), tool.name)
  }

  return { sdkTools: [...sdkTools], customTools, toSdk, toPi }
}

const buildMcpServers = (tools: Tool[]) => {
  if (!tools.length) return undefined
  return {
    custom: createSdkMcpServer({
      name: 'custom', version: '1.0.0',
      tools: tools.map(t => ({
        name: t.name, description: t.description, inputSchema: t.parameters as any,
        handler: async () => ({ content: [{ type: 'text', text: DENIED_MSG }], isError: true }),
      })),
    }),
  }
}

const mapArgs = (name: string, args: Record<string, any> = {}) => {
  const n = name.toLowerCase()
  if (n == 'read') return { path: args.file_path ?? args.path, offset: args.offset, limit: args.limit }
  if (n == 'write') return { path: args.file_path ?? args.path, content: args.content }
  if (n == 'edit') return { path: args.file_path ?? args.path, oldText: args.old_string ?? args.oldText, newText: args.new_string ?? args.newText }
  if (n == 'bash') return { command: args.command, timeout: args.timeout }
  if (n == 'grep') return { pattern: args.pattern, path: args.path, glob: args.glob, limit: args.head_limit ?? args.limit }
  if (n == 'find') return { pattern: args.pattern, path: args.path }
  return args
}

const parseJson = (s: string, fallback: Record<string, any>) => {
  if (!s) return fallback
  try { return JSON.parse(s) } catch { return fallback }
}

export type ClaudeStreamOptions = {
  getApiKey?: () => Promise<string | undefined>
  thinking?: { type: 'adaptive' } | { type: 'enabled'; budgetTokens: number } | { type: 'disabled' }
}

export const streamClaude = (
  model: Model<any>,
  ctx: Context,
  options: Record<string, any> | undefined,
  claude: ClaudeStreamOptions,
): AssistantMessageEventStream => {
  const stream = createAssistantMessageEventStream()

  ;(async () => {
    const output: AssistantMessage = {
      role: 'assistant', content: [], api: model.api, provider: model.provider,
      model: model.id, usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
      stopReason: 'stop', timestamp: Date.now(),
    }

    let sdkQuery: ReturnType<typeof query> | undefined
    let aborted = false
    const onAbort = () => { aborted = true; sdkQuery?.interrupt().catch(() => { try { sdkQuery?.close() } catch {} }) }
    if (options?.signal) {
      if (options.signal.aborted) onAbort()
      else options.signal.addEventListener('abort', onAbort, { once: true })
    }

    const blocks = output.content as any[]
    let started = false
    let sawStream = false
    let sawTool = false
    let shouldStop = false

    try {
      const apiKey = await claude.getApiKey?.()
      const env: Record<string, string | undefined> = { ...process.env }
      if (apiKey) env.ANTHROPIC_API_KEY = apiKey

      const { sdkTools, customTools, toSdk, toPi } = resolveTools(ctx)
      const promptBlocks = buildPrompt(ctx, toSdk)

      async function* promptGen(): AsyncGenerator<SDKUserMessage> {
        yield { type: 'user', message: { role: 'user', content: promptBlocks } as MessageParam, parent_tool_use_id: null, session_id: 'prompt' }
      }

      const systemPrompt = ctx.systemPrompt
        ? `${SPOOF_PREFIX}\n\n${ctx.systemPrompt}`
        : SPOOF_PREFIX

      const queryOpts: any = {
        cwd: options?.cwd ?? process.cwd(),
        model: model.id,
        tools: sdkTools,
        permissionMode: 'dontAsk',
        includePartialMessages: true,
        canUseTool: async () => ({ behavior: 'deny', message: DENIED_MSG }),
        systemPrompt,
        env,
        settingSources: [],
        strictMcpConfig: true,
        persistSession: false,
        ...(buildMcpServers(customTools) ? { mcpServers: buildMcpServers(customTools) } : {}),
      }

      if (claude.thinking) queryOpts.thinking = claude.thinking

      sdkQuery = query({ prompt: promptGen(), options: queryOpts })
      if (aborted) onAbort()

      for await (const message of sdkQuery) {
        if (!started) { stream.push({ type: 'start', partial: output }); started = true }

        if (message.type == 'stream_event') {
          sawStream = true
          const event = (message as any).event

          if (event?.type == 'message_start') {
            const u = event.message?.usage
            output.usage.input = u?.input_tokens ?? 0
            output.usage.output = u?.output_tokens ?? 0
            output.usage.cacheRead = u?.cache_read_input_tokens ?? 0
            output.usage.cacheWrite = u?.cache_creation_input_tokens ?? 0
            output.usage.totalTokens = output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite
            calculateCost(model, output.usage)
          } else if (event?.type == 'content_block_start') {
            const cb = event.content_block
            if (cb?.type == 'text') {
              output.content.push({ type: 'text', text: '', index: event.index })
              stream.push({ type: 'text_start', contentIndex: output.content.length - 1, partial: output })
            } else if (cb?.type == 'thinking') {
              output.content.push({ type: 'thinking', thinking: '', thinkingSignature: '', index: event.index })
              stream.push({ type: 'thinking_start', contentIndex: output.content.length - 1, partial: output })
            } else if (cb?.type == 'tool_use') {
              sawTool = true
              output.content.push({ type: 'toolCall', id: cb.id, name: sdkToPi(cb.name, toPi), arguments: cb.input ?? {}, partialJson: '', index: event.index })
              stream.push({ type: 'toolcall_start', contentIndex: output.content.length - 1, partial: output })
            }
          } else if (event?.type == 'content_block_delta') {
            const idx = blocks.findIndex((b: any) => b.index == event.index)
            const block = blocks[idx]
            if (!block) continue

            if (event.delta?.type == 'text_delta' && block.type == 'text') {
              block.text += event.delta.text
              stream.push({ type: 'text_delta', contentIndex: idx, delta: event.delta.text, partial: output })
            } else if (event.delta?.type == 'thinking_delta' && block.type == 'thinking') {
              block.thinking += event.delta.thinking
              stream.push({ type: 'thinking_delta', contentIndex: idx, delta: event.delta.thinking, partial: output })
            } else if (event.delta?.type == 'input_json_delta' && block.type == 'toolCall') {
              block.partialJson += event.delta.partial_json
              block.arguments = parseJson(block.partialJson, block.arguments)
              stream.push({ type: 'toolcall_delta', contentIndex: idx, delta: event.delta.partial_json, partial: output })
            } else if (event.delta?.type == 'signature_delta' && block.type == 'thinking') {
              block.thinkingSignature = (block.thinkingSignature ?? '') + event.delta.signature
            }
          } else if (event?.type == 'content_block_stop') {
            const idx = blocks.findIndex((b: any) => b.index == event.index)
            const block = blocks[idx]
            if (!block) continue
            delete block.index

            if (block.type == 'text') stream.push({ type: 'text_end', contentIndex: idx, content: block.text, partial: output })
            else if (block.type == 'thinking') stream.push({ type: 'thinking_end', contentIndex: idx, content: block.thinking, partial: output })
            else if (block.type == 'toolCall') {
              sawTool = true
              block.arguments = mapArgs(block.name, parseJson(block.partialJson, block.arguments))
              delete block.partialJson
              stream.push({ type: 'toolcall_end', contentIndex: idx, toolCall: block, partial: output })
            }
          } else if (event?.type == 'message_delta') {
            const sr = event.delta?.stop_reason
            output.stopReason = sr == 'tool_use' ? 'toolUse' : sr == 'max_tokens' ? 'length' : 'stop'
            const u = event.usage ?? {}
            if (u.input_tokens != null) output.usage.input = u.input_tokens
            if (u.output_tokens != null) output.usage.output = u.output_tokens
            if (u.cache_read_input_tokens != null) output.usage.cacheRead = u.cache_read_input_tokens
            if (u.cache_creation_input_tokens != null) output.usage.cacheWrite = u.cache_creation_input_tokens
            output.usage.totalTokens = output.usage.input + output.usage.output + output.usage.cacheRead + output.usage.cacheWrite
            calculateCost(model, output.usage)
          } else if (event?.type == 'message_stop' && sawTool) {
            output.stopReason = 'toolUse'
            shouldStop = true
          }
        } else if (message.type == 'result' && !sawStream && (message as any).subtype == 'success') {
          output.content.push({ type: 'text', text: (message as any).result || '' })
        }

        if (shouldStop) break
      }

      if (aborted || options?.signal?.aborted) {
        output.stopReason = 'aborted'
        output.errorMessage = 'Aborted'
        stream.push({ type: 'error', reason: 'aborted', error: output })
        stream.end()
        return
      }

      stream.push({ type: 'done', reason: output.stopReason == 'toolUse' ? 'toolUse' : output.stopReason == 'length' ? 'length' : 'stop', message: output })
      stream.end()
    } catch (err) {
      output.stopReason = options?.signal?.aborted ? 'aborted' : 'error'
      output.errorMessage = err instanceof Error ? err.message : String(err)
      stream.push({ type: 'error', reason: output.stopReason as any, error: output })
      stream.end()
    } finally {
      options?.signal?.removeEventListener('abort', onAbort)
      sdkQuery?.close()
    }
  })()

  return stream
}

