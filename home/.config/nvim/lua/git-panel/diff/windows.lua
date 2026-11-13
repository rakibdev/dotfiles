local M = {}

local function applyWinOpts(win, bound)
  vim.wo[win].scrollbind = bound
  vim.wo[win].cursorbind = bound
  vim.wo[win].signcolumn = 'no'
end

-- winfixbuf blocks nvim_win_set_buf too, not just external openers, so callers
-- must unlock() before placing a diff buffer and lock() again once it's placed
-- (also needed when reusing an already-locked window for a new selection).
function M.lockBuffers(state, locked)
  for _, win in ipairs({ state.diffOrigWin, state.diffModWin }) do
    if win and vim.api.nvim_win_is_valid(win) then
      vim.wo[win].winfixbuf = locked
    end
  end
end

local function isSidebar(win)
  local buf = vim.api.nvim_win_get_buf(win)
  local ok, ft = pcall(function() return vim.bo[buf].filetype end)
  return ok and ft == 'snacks_picker_list'
end

-- keep scrollbind in sync between the two diff windows without redoing it per open
vim.api.nvim_create_autocmd('WinEnter', {
  group    = vim.api.nvim_create_augroup('GitPanelSync', { clear = true }),
  callback = function()
    if vim.wo.scrollbind then pcall(vim.cmd, 'syncbind') end
  end,
})

local function ensureDiffArea(state)
  if state.diffAreaWin and vim.api.nvim_win_is_valid(state.diffAreaWin) then return end
  for _, w in ipairs(vim.api.nvim_tabpage_list_wins(0)) do
    if w ~= state.explorerWin and w ~= state.commitWin and not isSidebar(w) then
      state.diffAreaWin = w
      return
    end
  end
  vim.api.nvim_set_current_win(state.explorerWin)
  vim.cmd('rightbelow vsplit')
  state.diffAreaWin = vim.api.nvim_get_current_win()
end

local function toSingle(state)
  if state.diffOrigWin and vim.api.nvim_win_is_valid(state.diffOrigWin) then
    pcall(vim.api.nvim_win_close, state.diffOrigWin, true)
  end
  state.diffOrigWin = nil
  state.diffModWin  = state.diffAreaWin
  applyWinOpts(state.diffModWin, false)
  state.diffLayout = 'single'
end

local function toDouble(state)
  if state.diffLayout == 'double'
      and state.diffOrigWin and vim.api.nvim_win_is_valid(state.diffOrigWin)
      and state.diffModWin  and vim.api.nvim_win_is_valid(state.diffModWin) then
    return
  end

  local activeWin = vim.api.nvim_get_current_win()
  state.diffModWin = state.diffAreaWin
  vim.api.nvim_set_current_win(state.diffModWin)
  vim.cmd('leftabove vsplit')
  state.diffOrigWin = vim.api.nvim_get_current_win()

  applyWinOpts(state.diffOrigWin, true)
  applyWinOpts(state.diffModWin, true)
  state.diffLayout = 'double'

  vim.api.nvim_set_current_win(activeWin)
end

-- single entry point for window layout: ensures exactly one ('single') or two
-- ('double') diff windows exist, reusing the diff area window (state.diffAreaWin)
-- as the anchor. mode: 'single' | 'double'.
function M.ensureLayout(state, mode)
  ensureDiffArea(state)
  if mode == 'single' then toSingle(state) else toDouble(state) end
end

return M
