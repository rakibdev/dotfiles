vim.keymap.set({ 'n', 'i', 'v', 's' }, '<S-LeftMouse>', function()
  local mouse = vim.fn.getmousepos()
  if mouse.winid ~= vim.api.nvim_get_current_win() then return end

  local mode = vim.api.nvim_get_mode().mode
  if mode == 'i' then
    vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes('<Esc>v', true, false, true), 'nx', false)
  elseif mode:sub(1,1) ~= 'v' and mode:sub(1,1) ~= 's' and mode ~= '\22' and mode ~= '\19' then
    vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes('v', true, false, true), 'nx', false)
  end

  vim.fn.cursor(mouse.line, mouse.column)

  local selectmode = vim.opt.selectmode:get()
  local is_select = false
  for _, m in ipairs(selectmode) do
    if m == 'mouse' or m == 'key' then
      is_select = true
      break
    end
  end

  if is_select and vim.api.nvim_get_mode().mode:sub(1,1) == 'v' then
    vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes('<C-g>', true, false, true), 'nx', false)
  end
end)
