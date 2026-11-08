import { defineExtension } from 'crine'
import { setPanel } from 'crine/ui'
import { Signin, codex, xai, copilot, type Account } from 'crine/auth'
import { streamClaude, claudeCodeExtension, streamOpencodeFree, type ModelDef, type ModelSpec, type ClaudeStreamOptions } from 'crine/models'

const ZEN_MODEL = {
  api: 'openai-completions',
  baseUrl: 'https://opencode.ai/inference/openai/v1',
  reasoning: true,
  input: ['text', 'image'],
  contextWindow: 200_000,
  maxTokens: 32_000,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
} satisfies Partial<ModelSpec>

const CLAUDE_MODEL = {
  api: 'claude-agent-sdk',
  reasoning: true,
  input: ['text', 'image'],
  contextWindow: 1_000_000,
  maxTokens: 128_000
} satisfies Partial<ModelSpec>
const CLAUDE_REQUEST = {
  thinking: { type: 'adaptive', display: 'summarized' },
  effort: 'medium'
} satisfies ClaudeStreamOptions

export default defineExtension(() => {
  const claude = claudeCodeExtension()
  const signinItem = (name: string, account: Account) => ({
    name,
    description: account.connected() ? '✓ Connected' : '',
    onSelect: async () => {
      const link = await account.signin()
      setPanel(() => Signin(link))
    }
  })

  return {
    ...claude,
    models: {
      'deepseek-v4.1-flash-free': {
        label: 'DeepSeek V4.1 Flash Free',
        contextWindow: ZEN_MODEL.contextWindow,
        stream: (conversation, options) => streamOpencodeFree({ ...ZEN_MODEL, id: 'deepseek-v4.1-flash-free' }, conversation, options)
      },
      'glm-5.3-flash-free': {
        label: 'GLM 5.3 Flash Free',
        contextWindow: ZEN_MODEL.contextWindow,
        stream: (conversation, options) => streamOpencodeFree({ ...ZEN_MODEL, id: 'glm-5.3-flash-free' }, conversation, options)
      },
      'claude-sonnet-5-5': {
        label: 'Claude Sonnet 5.5',
        contextWindow: CLAUDE_MODEL.contextWindow,
        stream: (conversation, options) =>
          streamClaude(
            {
              ...CLAUDE_MODEL,
              id: 'claude-sonnet-5-5[1m]',
              cost: { input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 }
            },
            conversation,
            { ...options, ...CLAUDE_REQUEST }
          )
      },
      'claude-fable-5-1': {
        label: 'Claude Fable 5.1',
        contextWindow: CLAUDE_MODEL.contextWindow,
        stream: (conversation, options) =>
          streamClaude(
            {
              ...CLAUDE_MODEL,
              id: 'claude-fable-5-1',
              cost: { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 }
            },
            conversation,
            { ...options, ...CLAUDE_REQUEST }
          )
      },
      'claude-opus-5-5': {
        label: 'Claude Opus 5.5',
        contextWindow: CLAUDE_MODEL.contextWindow,
        stream: (conversation, options) =>
          streamClaude(
            {
              ...CLAUDE_MODEL,
              id: 'claude-opus-5-5[1m]',
              cost: { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 }
            },
            conversation,
            { ...options, ...CLAUDE_REQUEST }
          )
      },
      'claude-haiku-5-5': {
        label: 'Claude Haiku 5.5',
        contextWindow: CLAUDE_MODEL.contextWindow,
        stream: (conversation, options) =>
          streamClaude(
            {
              ...CLAUDE_MODEL,
              id: 'claude-haiku-5-5',
              cost: { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 }
            },
            conversation,
            { ...options, persistSession: true, maxTurns: 30 }
          )
      }
    } satisfies Record<string, ModelDef>,
    commands: [
      ...claude.commands,
      {
        name: 'signin',
        description: 'Sign in to providers',
        items: () => [
          signinItem('Codex', codex),
          signinItem('xAI', xai),
          signinItem('Copilot', copilot)
        ]
      }
    ]
  }
})
