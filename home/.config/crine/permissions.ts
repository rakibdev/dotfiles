import { defineExtension, parseCommands } from 'crine'

const writes = ['insert', 'update', 'delete', 'replaceOne', 'findOneAnd', 'bulkWrite', 'drop', 'createIndex', 'rename', 'save', 'remove']

// git stash/checkout/restore already ask via built-in. sudo not needed: terminal asks password
export default defineExtension(() => ({
  onToolCall: ({ name, args }) => {
    if (name != 'bash') return
    const { command } = args
    if (parseCommands(command).some(([name, arg1]) => name == 'tsc' || arg1 == 'tsc'))
      return { permission: { action: 'ask', reason: 'tsc' } }

    // mongodb skill: allow only read operations
    if (command.includes('scripts/run.ts'))
      return writes.some((word) => command.includes(word))
        ? { permission: { action: 'ask', reason: 'mongodb write' } }
        : { permission: { action: 'allow' } }
  }
}))
