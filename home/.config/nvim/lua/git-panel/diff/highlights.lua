local M = {}
local git         = require('git-panel.utils')
local computeDiff = require('git-panel.diff.libdiff').computeDiff
local ns          = vim.api.nvim_create_namespace('git_panel_diff')

local timers = {}

local function debounce(key, fn, ms)
  if timers[key] then timers[key]:stop(); timers[key]:close() end
  local t = vim.loop.new_timer()
  timers[key] = t
  t:start(ms, 0, vim.schedule_wrap(fn))
end

local function setBufLines(buf, lines)
  if buf and vim.api.nvim_buf_is_valid(buf) then
    vim.bo[buf].modifiable = true
    vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
    vim.bo[buf].modifiable = false
  end
end

local function applyHighlights(origBuf, modBuf, origLines, modLines, state, isInitial)
  if not (vim.api.nvim_buf_is_valid(origBuf) and vim.api.nvim_buf_is_valid(modBuf)) then return end
  local ok, result = pcall(computeDiff, origLines, modLines)
  if not ok or not result then return end

  state.diffChanges = result.changes

  vim.api.nvim_buf_clear_namespace(origBuf, ns, 0, -1)
  vim.api.nvim_buf_clear_namespace(modBuf,  ns, 0, -1)

  for _, change in ipairs(result.changes) do
    local o, m = change.original, change.modified
    for l = o.start_line, o.end_line - 1 do
      vim.api.nvim_buf_add_highlight(origBuf, ns, 'DiffDelete', l - 1, 0, -1)
    end
    for l = m.start_line, m.end_line - 1 do
      vim.api.nvim_buf_add_highlight(modBuf, ns, 'DiffAdd', l - 1, 0, -1)
    end
    for _, ic in ipairs(change.inner_changes or {}) do
      local oc, mc = ic.original, ic.modified
      vim.api.nvim_buf_add_highlight(origBuf, ns, 'DiffDeleteWord', oc.start_line - 1, oc.start_col - 1, oc.end_col - 1)
      vim.api.nvim_buf_add_highlight(modBuf,  ns, 'DiffAddWord',    mc.start_line - 1, mc.start_col - 1, mc.end_col - 1)
    end
  end

  if isInitial and #result.changes > 0 then
    local first = result.changes[1]
    if state.diffOrigWin and vim.api.nvim_win_is_valid(state.diffOrigWin) then
      vim.api.nvim_win_set_cursor(state.diffOrigWin, { math.max(1, math.min(first.original.start_line, #origLines)), 0 })
    end
    if state.diffModWin and vim.api.nvim_win_is_valid(state.diffModWin) then
      vim.api.nvim_win_set_cursor(state.diffModWin, { math.max(1, math.min(first.modified.start_line, #modLines)), 0 })
    end
  end
end

M.reload = git.async(function(state, isInitial)
  local sel = state.selected
  if not sel then return end
  local path      = sel.entry.path
  local status    = sel.entry.status
  local isStaged  = sel.group == 'staged'
  local isNew     = status == 'A' or status == '??'
  local isDeleted = status == 'D'
  local origRev   = isStaged and 'HEAD' or ':0'

  local targetOrigBuf = state.diffOrigBuf
  local targetModBuf  = state.diffModBuf

  if isNew then
    if isStaged then
      local _, idxLines = git.getFileContent(':0', state.gitRoot, path)
      if state.diffModBuf == targetModBuf then
        setBufLines(targetModBuf, idxLines or {})
      end
    end
    return
  end

  if isDeleted then
    local _, lines = git.getFileContent(origRev, state.gitRoot, path)
    lines = lines or {}
    if state.diffModBuf == targetModBuf then
      setBufLines(targetModBuf, lines)
      if vim.api.nvim_buf_is_valid(targetModBuf) then
        vim.api.nvim_buf_clear_namespace(targetModBuf, ns, 0, -1)
        for i = 1, #lines do
          vim.api.nvim_buf_add_highlight(targetModBuf, ns, 'DiffDelete', i - 1, 0, -1)
        end
      end
    end
    return
  end

  local _, origLines = git.getFileContent(origRev, state.gitRoot, path)
  origLines = origLines or {}
  if state.diffOrigBuf ~= targetOrigBuf or state.diffModBuf ~= targetModBuf then return end
  setBufLines(targetOrigBuf, origLines)

  if isStaged then
    local _, idxLines = git.getFileContent(':0', state.gitRoot, path)
    if state.diffOrigBuf ~= targetOrigBuf or state.diffModBuf ~= targetModBuf then return end
    setBufLines(targetModBuf, idxLines or {})
    applyHighlights(targetOrigBuf, targetModBuf, origLines, idxLines or {}, state, isInitial)
  else
    local modLines = vim.api.nvim_buf_get_lines(targetModBuf, 0, -1, false)
    applyHighlights(targetOrigBuf, targetModBuf, origLines, modLines, state, isInitial)
  end
end)

function M.watchEdits(state, origBuf, modBuf)
  vim.api.nvim_create_autocmd({ 'TextChanged', 'TextChangedI' }, {
    group  = vim.api.nvim_create_augroup('GitPanelDiffEdit', { clear = true }),
    buffer = modBuf,
    callback = function()
      debounce('diff', function()
        if not vim.api.nvim_buf_is_valid(origBuf) then return end
        local origLines = vim.api.nvim_buf_get_lines(origBuf, 0, -1, false)
        local modLines  = vim.api.nvim_buf_get_lines(modBuf, 0, -1, false)
        applyHighlights(origBuf, modBuf, origLines, modLines, state)
      end, 300)
    end,
  })
end

function M.clear(buf)
  if buf and vim.api.nvim_buf_is_valid(buf) then
    vim.api.nvim_buf_clear_namespace(buf, ns, 0, -1)
  end
end

return M
