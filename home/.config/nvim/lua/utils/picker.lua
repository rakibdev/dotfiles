local M = {}

M.title  = ''
M.prompt = ' '

M.layout = {
  hidden = { 'preview' },
  layout = {
    box      = 'vertical',
    border   = true,
    backdrop = false,
    width    = 0.4,
    min_width = 0,
    height   = 0.4,
    { win = 'input', height = 1, border = 'bottom' },
    { win = 'list',  border = 'none' },
  },
}

M.win = {
  input = { keys = { ['<Esc>'] = { 'cancel', mode = { 'n', 'i' } } } },
}

-- edit a file in a normal editor window, never a winfixbuf one
-- (commit box, terminals, locked panels). pos: optional { line, col }.
function M.openFile(file, pos)
  -- a window we can edit a file into: not locked (commit box, panels) and
  -- not a picker/special window. diff windows (nofile) are fine targets;
  -- git collapses its diff via its own BufWinEnter hook.
  local function editable(win)
    if not vim.api.nvim_win_is_valid(win) or vim.wo[win].winfixbuf then return false end
    return not vim.bo[vim.api.nvim_win_get_buf(win)].filetype:match('^snacks_')
  end

  local cur = vim.api.nvim_get_current_win()
  if not editable(cur) then
    local target
    for _, win in ipairs(vim.api.nvim_list_wins()) do
      if editable(win) then target = win; break end
    end
    if target then
      vim.api.nvim_set_current_win(target)
    else
      vim.cmd('botright vsplit')
    end
  end
  vim.cmd('edit ' .. vim.fn.fnameescape(file))
  if pos then vim.api.nvim_win_set_cursor(0, pos) end
end

return M
