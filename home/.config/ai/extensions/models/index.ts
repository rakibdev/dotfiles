import { defineExtension, streamClaude, getModel, type ModelDef, type ClaudeStreamOptions } from '@rakibdev/agent'
import { query, createSdkMcpServer } from 'open-claude-agent-sdk'

const ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }

export default defineExtension(ctx => {
  const { streamOpenAICompletions } = ctx

  const opencodeZen = (id: string, name: string, options?: Record<string, any>): ModelDef => {
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
            'x-opencode-session': 'ses_01a0af33d644SVLxmD5dVPYvXC',
            'User-Agent': 'opencode/1.18.31'
          }
        })
    } as ModelDef
  }

  const CLAUDE_BASE = {
    api: 'claude-agent-sdk' as any,
    provider: 'claude',
    baseUrl: 'claude-agent-sdk',
    input: ['text', 'image'] as ('text' | 'image')[]
  }

  const claudeCode = (id: string, name: string, opts: ClaudeStreamOptions): ModelDef => {
    const spec = getModel('anthropic', id.replace('[1m]', ''))
    const model = { ...CLAUDE_BASE, ...spec, id, name }
    return {
      ...model,
      stream: (context, options) => streamClaude(model, context, options, opts, { query, createSdkMcpServer })
    } as ModelDef
  }

  return {
    models: {
      'nemotron-3-ultra-free': opencodeZen('nemotron-3-ultra-free', 'Nemotron 3 Ultra Free'),
      'mimo-v2.6-flash-free': opencodeZen('mimo-v2.6-flash-free', 'MiMo-V2.6-Flash Free'),
      'big-pickle': opencodeZen('big-pickle', 'Big Pickle'),
      'claude-sonnet-5': claudeCode('claude-sonnet-5[1m]', 'Claude Sonnet 5', {
        thinking: { type: 'adaptive', display: 'summarized' },
        effort: 'medium'
      }),
      'claude-fable-5-1': claudeCode('claude-fable-5-1', 'Claude Fable 5.1', {
        thinking: { type: 'adaptive', display: 'summarized' },
        effort: 'medium'
      }),
      'claude-opus-5-5': claudeCode('claude-opus-5-5[1m]', 'Claude Opus 5.5', {
        thinking: { type: 'adaptive', display: 'summarized' },
        effort: 'medium'
      }),
      'claude-haiku-45': claudeCode('claude-haiku-4-5', 'Claude Haiku 4.5', {
        persistSession: true,
        maxTurns: 30
      })
    }
  }
})
