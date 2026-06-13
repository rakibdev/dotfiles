local api       = require("plugins.terminal.api")
local gotoTarget = require("plugins.terminal.goto")
local mention   = require("plugins.terminal.mention")

return {
  dir     = vim.fn.stdpath("config"),
  virtual = true,
  name    = "native-terminal",
  init = function()
    -- terminal: always re-enter insert on focus
    vim.api.nvim_create_autocmd({ 'TermOpen', 'BufEnter' }, {
      pattern = 'term://*',
      callback = function() vim.cmd('startinsert') end,
    })
  end,
  keys = {
    { '<C-`>',         api.toggle,      mode = { 'n', 't', 'v' }, desc = 'Toggle terminal' },
    { '<C-S-`>',       api.new,         mode = { 'n', 't', 'v' }, desc = 'New terminal' },
    { '<C-PageUp>',    api.cycle,       mode = { 'n', 't', 'v' }, desc = 'Cycle terminals' },
    { '<C-l>',         mention,         mode = { 'n', 'v' },      desc = 'Mention file in terminal' },
    { '<C-LeftMouse>', function() gotoTarget(api.window, function() api.window = nil end) end, mode = { 'n', 't', 'v' }, desc = 'Open path or URL under cursor' },
  },
}

