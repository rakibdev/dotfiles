import {
  defineExtension,
  type ModelDef,
  type Model,
  getModel,
  streamAnthropic,
  streamOpenAICompletions,
  streamGoogleGeminiCli
} from 'coder/api'
import { streamClaude, type ClaudeStreamOptions } from './anthropic'

const resolveEnv = (val: string) => val.replace(/\{(\w+)\}/g, (_, k) => process.env[k] ?? '')

const GEMINI_3_FLASH = getModel('google-antigravity', 'gemini-3-flash')
const GEMINI_3_PRO_LOW = getModel('google-antigravity', 'gemini-3-pro-low')

const KIMI_BASE = {
  api: 'anthropic-messages',
  provider: 'kimi',
  baseUrl: 'https://api.kimi.com/coding',
  reasoning: false,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 262144,
  maxTokens: 32768
} as const

const OPENCODE_BASE = {
  api: 'openai-completions',
  provider: 'opencode',
  baseUrl: 'https://opencode.ai/zen/v1',
  reasoning: false,
  input: ['text'],
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
  contextWindow: 100000,
  maxTokens: 8192
} as const

const CLAUDE_BASE = {
  api: 'claude-agent-sdk' as any,
  provider: 'claude',
  baseUrl: 'claude-agent-sdk',
  input: ['text', 'image'] as ('text' | 'image')[]
}

const fixKimiThinking = (payload: any) => {
  // fixes: reasoning_content is missing in assistant tool call message
  if (!payload?.messages) return
  for (const msg of payload.messages) {
    if (msg.role != 'assistant') continue
    const hasToolUse = msg.content?.some((b: any) => b.type == 'tool_use')
    if (!hasToolUse) continue
    const thinkingBlock = msg.content.find((b: any) => b.type == 'thinking')
    msg.reasoning_content = thinkingBlock?.thinking ?? ''
  }
}

const kimi = (id: string, name: string, streamOpts: Record<string, any> = {}): ModelDef => {
  const model = { ...KIMI_BASE, id, name, ...streamOpts } as Model<'anthropic-messages'>
  return {
    ...model,
    stream: (context, options) =>
      streamAnthropic(model, context, {
        ...options,
        apiKey: resolveEnv('{KIMI_API_KEY}'),
        ...streamOpts,
        onPayload: streamOpts.thinkingEnabled ? fixKimiThinking : undefined
      })
  }
}

const gemini = (base: Model<any>, name: string, thinking: Record<string, any> = {}): ModelDef => ({
  ...base,
  name,
  stream: (context, options) =>
    streamGoogleGeminiCli(base as any, context, { ...options, thinking: { enabled: true, ...thinking } })
})

const claude = (
  cfg: {
    id: string
    name: string
    reasoning: boolean
    contextWindow: number
    maxTokens: number
    cost: Model<any>['cost']
  },
  opts: ClaudeStreamOptions
): ModelDef => {
  const model = { ...CLAUDE_BASE, ...cfg } satisfies Model<any>
  return { ...model, stream: (context, options) => streamClaude(model, context, options, opts) }
}

export default defineExtension(ctx => {
  const getApiKey = () => ctx.getApiKey?.('anthropic') as Promise<string | undefined>

  return {
    models: {
      'claude-opus-46-minimal': claude(
        {
          id: 'claude-opus-4-6',
          name: 'Claude Opus 4.6 Minimal',
          reasoning: true,
          contextWindow: 200000,
          maxTokens: 32000,
          cost: { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 }
        },
        { getApiKey, thinking: { type: 'enabled', budgetTokens: 2048 } }
      ),
      'claude-sonnet-46': claude(
        {
          id: 'claude-sonnet-4-6',
          name: 'Claude Sonnet 4.6',
          reasoning: false,
          contextWindow: 200000,
          maxTokens: 16384,
          cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 }
        },
        { getApiKey, thinking: { type: 'disabled' } }
      ),
      'claude-haiku-45': claude(
        {
          id: 'claude-haiku-4-5-20251001',
          name: 'Claude Haiku 4.5',
          reasoning: false,
          contextWindow: 200000,
          maxTokens: 8192,
          cost: { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 }
        },
        { getApiKey, thinking: { type: 'disabled' } }
      ),

      kimi: kimi('kimi-for-coding', 'Kimi 2.5'),
      'kimi-thinking': kimi('kimi-for-coding', 'Kimi 2.5 Thinking', {
        reasoning: true,
        thinkingEnabled: true,
        thinkingBudgetTokens: 16000
      }),

      'minimax-m2.5': {
        ...OPENCODE_BASE,
        id: 'minimax-m2.5-free',
        name: 'Minimax M2.5',
        stream: (context, options) =>
          streamOpenAICompletions(
            { ...OPENCODE_BASE, id: 'minimax-m2.5-free', name: 'Minimax M2.5' } as Model<'openai-completions'>,
            context,
            { ...options, apiKey: ' ' }
          )
      } as ModelDef,

      'gemini-3-flash': gemini(GEMINI_3_FLASH, 'Gemini 3 Flash', { level: 'LOW' }),
      'gemini-3-pro-low': gemini(GEMINI_3_PRO_LOW, 'Gemini 3 Pro Low', { level: 'LOW' })
    }
  }
})
