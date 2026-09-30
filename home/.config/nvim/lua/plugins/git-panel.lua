return {
  dir = vim.fn.stdpath("config") .. "/lua/git-panel",
  lazy = true,
  keys = {
    { '<C-g>', function() require('git-panel').toggle() end, desc = 'Source control' },
  },
}
