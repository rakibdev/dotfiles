import { defineExtension } from 'coder/api'

export default defineExtension(ctx => ({
  commands: [{
    name: 'undo',
    description: 'Remove last exchange',
    onSelect: () => ctx.removeLastExchange?.()
  }]
}))
