import { defineSettings, corePrompt } from 'crine'
import { dark } from '@twinkleplop/theme-github/tokens'
import main from './main.md' with { type: 'text' }

export default defineSettings({
  theme: { syntax: dark },
  agents: {
    main: {
      system: async ({ cwd }) => [main.trim(), await corePrompt(cwd)].join('\n\n')
    }
  },
  extensions: [() => import('./models.ts'), () => import('./permissions.ts')]
})
