local M = {}
local computeDiff = require('git-panel.diff.libdiff').computeDiff
local ns          = vim.api.nvim_create_namespace('git_panel_diff')
local nsFiller    = vim.api.nvim_create_namespace('git_panel_filler')

local FILLER_TEXT = string.rep(' ', 500)

local function insertFillers(buf, targetLine, count)
  if count <= 0 then return end
  local above = targetLine < 0
  local line = above and 0 or targetLine
  local virtLines = {}
  for _ = 1, count do
    table.insert(virtLines, { { FILLER_TEXT, 'NonText' } })
  end
  vim.api.nvim_buf_set_extmark(buf, nsFiller, line, 0, {
    virt_lines       = virtLines,
    virt_lines_above = above,
  })
end

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

local function applyHighlights(origBuf, modBuf, origLines, modLines, state)
  if not (vim.api.nvim_buf_is_valid(origBuf) and vim.api.nvim_buf_is_valid(modBuf)) then return end
  local ok, result = pcall(computeDiff, origLines, modLines, { ignore_trim_whitespace = true })
  if not ok or not result then return end

  state.diffChanges = result.changes

  vim.api.nvim_buf_clear_namespace(origBuf, ns, 0, -1)
  vim.api.nvim_buf_clear_namespace(modBuf,  ns, 0, -1)
  vim.api.nvim_buf_clear_namespace(origBuf, nsFiller, 0, -1)
  vim.api.nvim_buf_clear_namespace(modBuf,  nsFiller, 0, -1)

  for _, change in ipairs(result.changes) do
    local o, m = change.original, change.modified
    for l = o.start_line, o.end_line - 1 do
      vim.api.nvim_buf_add_highlight(origBuf, ns, 'DiffDelete', l - 1, 0, -1)
    end
    for l = m.start_line, m.end_line - 1 do
      vim.api.nvim_buf_add_highlight(modBuf, ns, 'DiffAdd', l - 1, 0, -1)
    end

    local oLen = o.end_line - o.start_line
    local mLen = m.end_line - m.start_line
    local diff = oLen - mLen
    if diff > 0 then
      local targetLine = mLen == 0 and (m.start_line <= 1 and -1 or m.start_line - 2) or (m.end_line - 2)
      insertFillers(modBuf, targetLine, diff)
    elseif diff < 0 then
      local targetLine = oLen == 0 and (o.start_line <= 1 and -1 or o.start_line - 2) or (o.end_line - 2)
      insertFillers(origBuf, targetLine, -diff)
    end
  end

end

-- jumps both panes to the first change. must run AFTER the diff buffers are
-- placed in their windows, else the line number is clamped against whatever
-- buffer the window still shows (the previous file) and can be out of range.
function M.gotoFirstChange(state)
  local first = state.diffChanges and state.diffChanges[1]
  if not first then return end
  local targets = {
    { win = state.diffOrigWin, line = first.original.start_line },
    { win = state.diffModWin,  line = first.modified.start_line },
  }
  for _, t in ipairs(targets) do
    if t.win and vim.api.nvim_win_is_valid(t.win) then
      local lineCount = vim.api.nvim_buf_line_count(vim.api.nvim_win_get_buf(t.win))
      pcall(vim.api.nvim_win_set_cursor, t.win, { math.max(1, math.min(t.line, lineCount)), 0 })
    end
  end
end

-- puts both panes on `line` (clamped). cursorbind keeps them tied afterwards.
function M.gotoLine(state, line)
  for _, win in ipairs({ state.diffOrigWin, state.diffModWin }) do
    if win and vim.api.nvim_win_is_valid(win) then
      local lineCount = vim.api.nvim_buf_line_count(vim.api.nvim_win_get_buf(win))
      vim.api.nvim_win_set_cursor(win, { math.max(1, math.min(line, lineCount)), 0 })
    end
  end
end

-- refreshes an already rendered diff in place. `fetched.kind` must equal the
-- rendered kind (state.diffKind), else the buffers here don't fit it.
function M.reload(state, fetched)
  local targetOrigBuf = state.diffOrigBuf
  local targetModBuf  = state.diffModBuf

  if fetched.kind == 'new' then
    if not fetched.useRealBuffer then
      setBufLines(targetModBuf, fetched.modLines)
    end
    return
  end

  if fetched.kind == 'binary' then return end

  if fetched.kind == 'deleted' then
    setBufLines(targetModBuf, fetched.modLines)
    M.markAllDeleted(targetModBuf, #fetched.modLines)
    return
  end

  setBufLines(targetOrigBuf, fetched.origLines)
  local modLines = fetched.useRealBuffer
    and vim.api.nvim_buf_get_lines(targetModBuf, 0, -1, false)
    or fetched.modLines
  if not fetched.useRealBuffer then setBufLines(targetModBuf, modLines) end
  applyHighlights(targetOrigBuf, targetModBuf, fetched.origLines, modLines, state)
end

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

function M.markAllDeleted(buf, count)
  if not vim.api.nvim_buf_is_valid(buf) then return end
  vim.api.nvim_buf_clear_namespace(buf, ns, 0, -1)
  for i = 1, count do
    vim.api.nvim_buf_add_highlight(buf, ns, 'DiffDelete', i - 1, 0, -1)
  end
end

function M.clear(buf)
  if buf and vim.api.nvim_buf_is_valid(buf) then
    vim.api.nvim_buf_clear_namespace(buf, ns, 0, -1)
    vim.api.nvim_buf_clear_namespace(buf, nsFiller, 0, -1)
  end
end

M.apply = applyHighlights

return M
