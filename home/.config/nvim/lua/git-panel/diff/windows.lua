local M = {}

local function applyWinOpts(win)
  vim.wo[win].scrollbind     = true
  vim.wo[win].cursorbind     = true
  vim.wo[win].signcolumn     = 'no'
end

function M.ensureDiffArea(state)
  if state.diffAreaWin and vim.api.nvim_win_is_valid(state.diffAreaWin) then return end
  local tabWins = vim.api.nvim_tabpage_list_wins(state.tab)
  for _, w in ipairs(tabWins) do
    if w ~= state.explorerWin then
      state.diffAreaWin = w
      return
    end
  end
  vim.api.nvim_set_current_win(state.explorerWin)
  vim.cmd('rightbelow vsplit')
  state.diffAreaWin = vim.api.nvim_get_current_win()
end

function M.setupSingle(state)
  if state.diffOrigWin and vim.api.nvim_win_is_valid(state.diffOrigWin) then
    pcall(vim.api.nvim_win_close, state.diffOrigWin, true)
  end
  state.diffOrigWin = nil
  state.diffModWin  = state.diffAreaWin
end

function M.setupDouble(state)
  local hasWins = state.diffOrigWin and vim.api.nvim_win_is_valid(state.diffOrigWin)
               and state.diffModWin  and vim.api.nvim_win_is_valid(state.diffModWin)
  if hasWins then return end

  local activeWin = vim.api.nvim_get_current_win()
  vim.api.nvim_set_current_win(state.diffAreaWin)
  state.diffModWin = state.diffAreaWin
  vim.cmd('leftabove vsplit')
  state.diffOrigWin = vim.api.nvim_get_current_win()

  for _, win in ipairs({ state.diffOrigWin, state.diffModWin }) do
    applyWinOpts(win)
  end

  vim.api.nvim_create_autocmd('WinEnter', {
    group    = vim.api.nvim_create_augroup('GitPanelSync', { clear = true }),
    callback = function()
      if vim.wo.scrollbind then pcall(vim.cmd, 'syncbind') end
    end,
  })

  vim.api.nvim_set_current_win(activeWin)
end

return M
