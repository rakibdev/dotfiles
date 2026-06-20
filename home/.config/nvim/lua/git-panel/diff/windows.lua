local M = {}

local function applyWinOpts(win)
  vim.wo[win].scrollbind     = true
  vim.wo[win].cursorbind     = true
  vim.wo[win].signcolumn     = 'no'
end

local function isSidebar(win)
  local buf = vim.api.nvim_win_get_buf(win)
  local ok, ft = pcall(function() return vim.bo[buf].filetype end)
  return ok and ft == 'snacks_picker_list'
end

-- returns the main editor window (existing diff area if valid, else first
-- non-sidebar window), used as the anchor when (re)opening git-mode.
function M.editorWin(state)
  if state.diffModWin and vim.api.nvim_win_is_valid(state.diffModWin) then
    return state.diffModWin
  end
  for _, win in ipairs(vim.api.nvim_list_wins()) do
    if not isSidebar(win) then return win end
  end
  return vim.api.nvim_get_current_win()
end

function M.ensureDiffArea(state)
  if state.diffAreaWin and vim.api.nvim_win_is_valid(state.diffAreaWin) then return end
  for _, w in ipairs(vim.api.nvim_list_wins()) do
    if w ~= state.explorerWin and w ~= state.commitWin and not isSidebar(w) then
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
