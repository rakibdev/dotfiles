return {
  dir = vim.fn.stdpath("config") .. "/lua/git-panel",
  lazy = true,
  keys = {
    { '<C-g>', function() require('git-panel').open() end, desc = 'Source control' },
  },
}
