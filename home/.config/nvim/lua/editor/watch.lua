return {
  dir = vim.fn.stdpath('config'),
  name = 'autoread',
  lazy = false,
  config = function()
    -- silence "file no longer available" warning; external writes (ai agent) win over unsaved edits
    vim.api.nvim_create_autocmd('FileChangedShell', {
      callback = function()
        local reason = vim.v.fcs_reason
        if reason == 'deleted' then
          vim.v.fcs_choice = 'ignore'
        elseif reason == 'changed' or reason == 'conflict' then
          vim.v.fcs_choice = 'reload'
        end
      end,
    })
    -- auto refresh buffer when file changes outside
    vim.api.nvim_create_autocmd({ 'FocusGained', 'BufEnter', 'CursorHold', 'CursorHoldI' }, {
      callback = function()
        if vim.fn.getcmdwintype() == '' then
          vim.cmd('checktime')
        end
      end,
    })
  end,
}
