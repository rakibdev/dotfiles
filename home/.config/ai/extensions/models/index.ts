import {
  defineExtension,
  type ModelDef,
  type Model,
  streamAnthropic,
  streamClaude,
  type ClaudeStreamOptions,
  COPILOT_HEADERS,
  COPILOT_BASE_URL,
  streamCopilotAnthropic,
  streamCopilotOpenAIResponses
} from 'coder/api'

const resolveEnv = (val: string) => val.replace(/\{(\w+)\}/g, (_, k) => process.env[k] ?? '')

const KIMI_BASE = {
  api: 'anthropic-messages',
  provider: 'kimi',
  baseUrl: 'https://api.kimi.com/coding',
  reasoning: false,
  input: ['text'],
  contextWindow: 262144,
  maxTokens: 32768
} as const

const OPENCODE_BASE = {
  api: 'openai-completions',
  provider: 'opencode',
  baseUrl: 'https://opencode.ai/zen/v1',
  reasoning: false,
  input: ['text'],
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

const COPILOT_ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

const copilotAnthropic = (id: string, name: string, opts: Record<string, any> = {}): ModelDef => {
  const model = {
    id,
    name,
    api: 'anthropic-messages' as const,
    provider: 'github-copilot',
    baseUrl: COPILOT_BASE_URL,
    headers: COPILOT_HEADERS,
    reasoning: true,
    input: ['text', 'image'] as ('text' | 'image')[],
    cost: COPILOT_ZERO_COST,
    contextWindow: 128000,
    maxTokens: 32000,
    ...opts
  } satisfies Model<'anthropic-messages'>
  return {
    ...model,
    stream: (context, options) =>
      streamCopilotAnthropic(model, context, { ...options, interleavedThinking: true })
  }
}

const copilotOpenAI = (id: string, name: string, opts: Record<string, any> = {}): ModelDef => {
  const model = {
    id,
    name,
    api: 'openai-responses' as const,
    provider: 'github-copilot',
    baseUrl: COPILOT_BASE_URL,
    headers: COPILOT_HEADERS,
    reasoning: true,
    input: ['text', 'image'] as ('text' | 'image')[],
    cost: COPILOT_ZERO_COST,
    contextWindow: 128000,
    maxTokens: 64000,
    ...opts
  } satisfies Model<'openai-responses'>
  return {
    ...model,
    stream: (context, options) => streamCopilotOpenAIResponses(model, context, options)
  }
}

export default defineExtension(ctx => {
  const getApiKey = () => ctx.getApiKey?.('anthropic') as Promise<string | undefined>
  const { settingsPath } = ctx

  return {
    models: {
      'copilot-claude-haiku-45': copilotAnthropic('claude-haiku-4.5', 'Claude Haiku 4.5 (Copilot)'),
      'copilot-gpt-5-mini': copilotOpenAI('gpt-5-mini', 'GPT-5 Mini (Copilot)'),
      'claude-opus-46-minimal': claude(
        {
          id: 'claude-opus-4-6',
          name: 'Claude Opus 4.6 Minimal',
          reasoning: true,
          contextWindow: 200000,
          maxTokens: 32000,
          cost: { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 }
        },
        { getApiKey, settingsPath, thinking: { type: 'enabled', budgetTokens: 2048 } }
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
        { getApiKey, settingsPath }
      ),
      'claude-haiku-45': claude(
        {
          id: 'claude-haiku-4-5',
          name: 'Claude Haiku 4.5',
          reasoning: false,
          contextWindow: 200000,
          maxTokens: 8192,
          cost: { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 }
        },
        { getApiKey, settingsPath }
      ),

      kimi: kimi('kimi-for-coding', 'Kimi 2.5'),
      'kimi-thinking': kimi('kimi-for-coding', 'Kimi 2.5 Thinking', {
        reasoning: true,
        thinkingEnabled: true,
        thinkingBudgetTokens: 16000
      })
    }
  }
})
