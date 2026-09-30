return {
  dir = vim.fn.stdpath('config'),
  name = 'autoread',
  lazy = false,
  config = function()
    vim.o.autoread = true
    -- silence "file no longer available" warning
    vim.api.nvim_create_autocmd('FileChangedShell', {
      callback = function()
        if vim.v.fcs_reason == 'deleted' then
          vim.v.fcs_choice = 'ignore'
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
