import {
  defineExtension,
  type ModelDef,
  type Model,
  streamAnthropic,
  streamOpenAICompletions,
  streamClaude,
  type ClaudeStreamOptions,
  COPILOT_HEADERS,
  COPILOT_BASE_URL,
  streamCopilotAnthropic,
  streamCopilotOpenAIResponses
} from 'coder/api'

const ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

const opencodeGo = (id: string, name: string): ModelDef => {
  const model = {
    id,
    name,
    baseUrl: 'https://opencode.ai/zen/go/v1',
    input: ['text'] as ('text' | 'image')[],
    cost: ZERO_COST
  } as Model<'openai-completions'>
  return {
    ...model,
    stream: (context, options) =>
      streamOpenAICompletions(model, context, { ...options, apiKey: process.env.OPENCODE_GO_KEY })
  }
}

const opencodeGoAnthropic = (id: string, name: string): ModelDef => {
  const model = {
    id,
    name,
    baseUrl: 'https://opencode.ai/zen/go',
    input: ['text'] as ('text' | 'image')[]
  } as Model<'anthropic-messages'>
  return {
    ...model,
    stream: (context, options) => streamAnthropic(model, context, { ...options, apiKey: process.env.OPENCODE_GO_KEY })
  }
}

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
    cost: ZERO_COST,
    contextWindow: 128000,
    maxTokens: 32000,
    ...opts
  } satisfies Model<'anthropic-messages'>
  return {
    ...model,
    stream: (context, options) => streamCopilotAnthropic(model, context, { ...options, interleavedThinking: true })
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
    cost: ZERO_COST,
    contextWindow: 128000,
    maxTokens: 64000,
    ...opts
  } satisfies Model<'openai-responses'>
  return {
    ...model,
    stream: (context, options) => streamCopilotOpenAIResponses(model, context, options)
  }
}

const CLAUDE_BASE = {
  api: 'claude-agent-sdk' as any,
  provider: 'claude',
  baseUrl: 'claude-agent-sdk',
  input: ['text', 'image'] as ('text' | 'image')[]
}

const claudeCode = (
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
  const { settingsPath } = ctx

  return {
    models: {
      'glm-5': opencodeGo('glm-5', 'GLM-5'),
      'kimi-k2-5': opencodeGo('kimi-k2.5', 'Kimi K2.5'),
      'minimax-m2-5': opencodeGoAnthropic('minimax-m2.5', 'MiniMax M2.5'),
      'copilot-claude-haiku-45': copilotAnthropic('claude-haiku-4.5', 'Claude Haiku 4.5 (Copilot)'),
      'copilot-gpt-5-mini': copilotOpenAI('gpt-5-mini', 'GPT-5 Mini (Copilot)'),
      'claude-sonnet-46': claudeCode(
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
      'claude-haiku-45': claudeCode(
        {
          id: 'claude-haiku-4-5',
          name: 'Claude Haiku 4.5',
          reasoning: false,
          contextWindow: 200000,
          maxTokens: 8192,
          cost: { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1 }
        },
        { getApiKey, settingsPath }
      )
    }
  }
})
