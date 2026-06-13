import { streamAlibaba } from './alibaba.ts'

const defineExtension = (fn: (ctx: any) => any) => fn

const ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

export default defineExtension(ctx => {
  const { streamClaude, streamOpenAICompletions, COPILOT_HEADERS, COPILOT_BASE_URL, streamCopilotAnthropic } = ctx

  const getApiKey = () => ctx.getApiKey?.('anthropic') as Promise<string | undefined>
  const { settingsPath } = ctx

  const opencodeZen = (id: string, name: string, options?: Record<string, any>): any => {
    const model = {
      id,
      name,
      baseUrl: 'https://opencode.ai/zen/v1',
      input: ['text', 'image'] as ('text' | 'image')[],
      cost: ZERO_COST
    }
    return {
      ...model,
      stream: (context, _options) =>
        streamOpenAICompletions(model, context, {
          ...options,
          ..._options,
          apiKey: ' ',
          headers: {
            'x-opencode-session': 'user123'
          }
        })
    }
  }

  const crofai = (id: string, name: string, options?: Record<string, any>): any => {
    const model = {
      id,
      name,
      baseUrl: 'https://crof.ai/v2',
      input: ['text', 'image'] as ('text' | 'image')[],
      cost: ZERO_COST
    }
    return {
      ...model,
      stream: (context, _options) =>
        streamOpenAICompletions(model, context, {
          ...options,
          ..._options,
          apiKey: process.env.CROF_AI
        })
    }
  }

  const copilotAnthropic = (id: string, name: string, opts: Record<string, any> = {}): any => {
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
    }
    return {
      ...model,
      stream: (context, options) => streamCopilotAnthropic(model, context, { ...options, interleavedThinking: true })
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
      cost: any
    },
    opts: any
  ): any => {
    const model = { ...CLAUDE_BASE, ...cfg }
    return { ...model, stream: (context, options) => streamClaude(model, context, options, opts) }
  }

  return {
    models: {
      'kimi-k2-6': crofai('kimi-k2.6', 'Kimi K2.6', {
        onPayload: (payload: any) => {
          payload.reasoning_effort = 'low'
          return payload
        }
      }),
      'deepseek-v4-pro': crofai('deepseek-v4-pro', 'DeepSeek V4 Pro'),
      'qwen3.6-27b': crofai('qwen3.6-27b', 'Qwen 3.6'),
      'minimax-m2.5-free': opencodeZen('minimax-m2.5-free', 'MiniMax M2.5 Free'),
      'copilot-claude-haiku-45': copilotAnthropic('claude-haiku-4.5', 'Claude Haiku 4.5 (Copilot)'),
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
        { getApiKey, settingsPath, persistSession: true, maxTurns: 30 }
      )
    }
  }
})
