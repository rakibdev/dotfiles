-- neovim output (e.g. :messages, LSP errors, terminal) has lots of padding whitespace.
-- when copying to send to AI, that wastes tokens and context window. so trim it.
local function copyText()
  local s = vim.fn.line('v')
  local e = vim.fn.line('.')
  if s > e then s, e = e, s end
  local lines = vim.api.nvim_buf_get_lines(0, s - 1, e, false)
  local trimmed = {}
  for _, l in ipairs(lines) do
    trimmed[#trimmed + 1] = l:match('^%s*(.-)%s*$')
  end
  local text = table.concat(trimmed, '\n')
  -- collapse multiple blank lines into one, collapse multiple spaces into one
  text = text:gsub('\n\n+', '\n\n'):gsub(' +', ' '):match('^%s*(.-)%s*$')
  vim.fn.setreg('+', text)
  vim.fn.setreg('"', text)
  vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes('<Esc>', true, false, true), 'nx', false)
end

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

return { copyText = copyText }
