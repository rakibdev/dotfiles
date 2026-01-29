import type { Plugin } from '@opencode-ai/plugin'

const HEADERS = {
  'User-Agent': 'Kilo-Code/4.91.0',
  'X-KiloCode-Version': '4.91.0',
  'HTTP-Referer': 'https://kilocode.ai',
  'X-Title': 'Kilo Code'
}

const ZERO_COST = { input: 0, output: 0, cache: { read: 0, write: 0 } }

export const KiloCodeAuthPlugin: Plugin = async ({ client }) => {
  const apiKey = process.env.KILOCODE_API_KEY
  if (!apiKey) throw new Error('KILOCODE_API_KEY env var required')

  return {
    auth: {
      provider: 'kilocode',

      loader: async (getAuth) => {
        const info = await getAuth()
        if (info.type != 'api') return {}

        return {
          async fetch(input, init) {
            const url = new URL(input instanceof Request ? input.url : String(input))
            const targetUrl = `https://kilocode.ai/api/openrouter${url.pathname}${url.search}`

            const headers = {
              ...init?.headers,
              ...HEADERS,
              Authorization: `Bearer ${apiKey}`
            }
            delete headers['x-api-key']

            return fetch(targetUrl, { ...init, headers })
          }
        }
      }
    },

    config: async config => {
      const kilocode = config.provider?.kilocode
      const models = kilocode?.models || {}

      for (const model of Object.values(models)) {
        model.cost = ZERO_COST
      }

      config.provider = {
        ...config.provider,
        kilocode: {
          name: 'Kilo Code',
          npm: '@ai-sdk/openai-compatible',
          ...kilocode,
          models,
          options: {
            baseURL: 'https://kilocode.ai/api/openrouter',
            ...kilocode?.options,
            apiKey,
            headers: HEADERS
          }
        }
      }
    }
  }
}

export default KiloCodeAuthPlugin
