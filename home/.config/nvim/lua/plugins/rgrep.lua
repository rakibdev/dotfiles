local function open(options)
  local gitPanel = require('git-panel')
  if gitPanel.isActive() then gitPanel.close({ carry = false }) end
  require('rgrep').open(vim.tbl_extend('force', { edit = require('utils.picker').openFile }, options))
end

return {
  dir = '~/Downloads/rgrep',
  keys = {
    { 'ff', function() open({}) end },
    { '<C-p>', function() open({ files = true }) end },
  },
}
