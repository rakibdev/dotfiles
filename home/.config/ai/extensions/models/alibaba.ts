import { createAlibaba } from '@ai-sdk/alibaba'
import {
  createAssistantMessageEventStream,
  type AssistantMessage,
  type Context,
  type Model,
  type SimpleStreamOptions
} from '@mariozechner/pi-ai'

const convertPrompt = (context: Context) => {
  const prompt: any[] = []

  if (context.systemPrompt) prompt.push({ role: 'system', content: context.systemPrompt })

  for (const msg of context.messages) {
    if (msg.role === 'user') {
      prompt.push({
        role: 'user',
        content:
          typeof msg.content === 'string'
            ? [{ type: 'text', text: msg.content }]
            : msg.content.map(p =>
                p.type === 'text'
                  ? { type: 'text', text: p.text }
                  : { type: 'file', data: p.data, mediaType: p.mimeType }
              )
      })
    } else if (msg.role === 'assistant') {
      const content: any[] = []
      for (const b of msg.content) {
        if (b.type === 'text' && b.text.trim()) content.push({ type: 'text', text: b.text })
        else if (b.type === 'thinking' && b.thinking.trim()) content.push({ type: 'reasoning', text: b.thinking })
        else if (b.type === 'toolCall')
          content.push({ type: 'tool-call', toolCallId: b.id, toolName: b.name, input: b.arguments })
      }
      if (content.length) prompt.push({ role: 'assistant', content })
    } else if (msg.role === 'toolResult') {
      const text = msg.content
        .filter(c => c.type === 'text')
        .map(c => (c as any).text)
        .join('\n')
      prompt.push({
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: msg.toolCallId,
            toolName: msg.toolName,
            output: { type: 'text', value: text || '(done)' },
            isError: msg.isError
          }
        ]
      })
    }
  }
  return prompt
}

const convertTools = (tools: Context['tools']) => {
  if (!tools?.length) return undefined
  return tools.map(t => ({
    type: 'function' as const,
    name: t.name,
    description: t.description,
    inputSchema: t.parameters
  }))
}

export const streamAlibaba = (model: Model<any>, context: Context, options?: SimpleStreamOptions) => {
  const stream = createAssistantMessageEventStream()

  ;(async () => {
    const output: AssistantMessage = {
      role: 'assistant',
      content: [],
      api: model.api ?? 'openai-completions',
      provider: model.provider ?? 'alibaba',
      model: model.id,
      usage: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        totalTokens: 0,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
      },
      stopReason: 'stop',
      timestamp: Date.now()
    }

    try {
      const alibaba = createAlibaba({ apiKey: options?.apiKey, baseURL: model.baseUrl })
      const lm = alibaba.languageModel(model.id as any)
      const tools = convertTools(context.tools)
      const { stream: vs } = await lm.doStream({
        prompt: convertPrompt(context),
        ...(tools?.length && { tools }),
        ...(options?.maxTokens && { maxOutputTokens: options.maxTokens }),
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
        ...(options?.signal && { abortSignal: options.signal })
      })

      stream.push({ type: 'start', partial: output })

      for await (const part of vs) {
        switch (part.type) {
          case 'text-start': {
            output.content.push({ type: 'text', text: '' })
            stream.push({ type: 'text_start', contentIndex: output.content.length - 1, partial: output })
            break
          }
          case 'text-delta': {
            const idx = output.content.findLastIndex(b => b.type === 'text')
            if (idx !== -1) {
              ;(output.content[idx] as any).text += part.delta
              stream.push({ type: 'text_delta', contentIndex: idx, delta: part.delta, partial: output })
            }
            break
          }
          case 'text-end': {
            const idx = output.content.findLastIndex(b => b.type === 'text')
            if (idx !== -1)
              stream.push({
                type: 'text_end',
                contentIndex: idx,
                content: (output.content[idx] as any).text,
                partial: output
              })
            break
          }
          case 'reasoning-start': {
            output.content.push({ type: 'thinking', thinking: '' })
            stream.push({ type: 'thinking_start', contentIndex: output.content.length - 1, partial: output })
            break
          }
          case 'reasoning-delta': {
            const idx = output.content.findLastIndex(b => b.type === 'thinking')
            if (idx !== -1) {
              ;(output.content[idx] as any).thinking += part.delta
              stream.push({ type: 'thinking_delta', contentIndex: idx, delta: part.delta, partial: output })
            }
            break
          }
          case 'reasoning-end': {
            const idx = output.content.findLastIndex(b => b.type === 'thinking')
            if (idx !== -1)
              stream.push({
                type: 'thinking_end',
                contentIndex: idx,
                content: (output.content[idx] as any).thinking,
                partial: output
              })
            break
          }
          case 'tool-call': {
            const input = typeof part.input === 'string' ? JSON.parse(part.input) : part.input
            const block: any = { type: 'toolCall', id: part.toolCallId, name: part.toolName, arguments: input }
            output.content.push(block)
            const idx = output.content.length - 1
            stream.push({ type: 'toolcall_start', contentIndex: idx, partial: output })
            stream.push({ type: 'toolcall_end', contentIndex: idx, toolCall: block, partial: output })
            break
          }
          case 'finish': {
            const u = part.usage as any
            const cacheRead = u?.inputTokens?.cacheRead ?? 0
            const cacheWrite = u?.inputTokens?.cacheWrite ?? 0
            const inputTotal = u?.inputTokens?.total ?? 0
            const outputTokens = u?.outputTokens?.total ?? 0
            output.usage = {
              input: Math.max(0, inputTotal - cacheRead - cacheWrite),
              output: outputTokens,
              cacheRead,
              cacheWrite,
              totalTokens: inputTotal + outputTokens,
              cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 }
            }
            const r = part.finishReason?.unified
            output.stopReason = r === 'length' ? 'length' : r === 'tool-calls' ? 'toolUse' : 'stop'
            break
          }
        }
      }

      stream.push({ type: 'done', reason: output.stopReason as any, message: output })
      stream.end()
    } catch (error) {
      output.stopReason = options?.signal?.aborted ? 'aborted' : 'error'
      output.errorMessage = error instanceof Error ? error.message : JSON.stringify(error)
      stream.push({ type: 'error', reason: output.stopReason as any, error: output })
      stream.end()
    }
  })()

  return stream
}
