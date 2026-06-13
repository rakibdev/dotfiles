local M = {}

local pickerUtil = require('utils.picker')

function M.open()
  local root = require('utils.git').getActiveRoot()
  if not root then
    vim.notify('Not in a git repo', vim.log.levels.WARN)
    return
  end
  Snacks.picker.git_branches({
    title    = pickerUtil.title,
    prompt   = pickerUtil.prompt,
    cwd      = root,
    layout   = pickerUtil.layout,
    win      = pickerUtil.win,
    on_close = function() vim.cmd('redrawstatus!') end,
  })
end

return M
