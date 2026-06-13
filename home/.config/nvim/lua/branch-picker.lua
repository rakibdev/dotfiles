local M = {}

function M.open()
  local root = require('utils.git').getActiveRoot()
  if not root then
    vim.notify('Not in a git repo', vim.log.levels.WARN)
    return
  end
  Snacks.picker.git_branches({
    cwd    = root,
    layout = { preview = false, layout = { width = 0.4 } },
    on_close = function() vim.cmd('redrawstatus!') end,
    win = {
      input = {
        keys = {
          ['<Esc>'] = { 'cancel', mode = { 'n', 'i' } },
        },
      },
    },
  })
end

return M
