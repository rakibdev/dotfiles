local M    = {}
local hl   = require('git-panel.diff.highlights')
local wins = require('git-panel.diff.windows')
local data = require('git-panel.diff.data')

function M.clear(state)
  hl.clear(state.diffOrigBuf)
  hl.clear(state.diffModBuf)
end

-- leaving git-mode: the modified pane holds the REAL file buffer, shared with
-- the home tab, so its diff highlights/fillers and disabled diagnostics would
-- follow you out. strip them and stop the edit watcher (which would otherwise
-- re-add highlights as you type there). re-entry re-renders everything.
function M.detach(state)
  hl.clear(state.diffOrigBuf)
  hl.clear(state.diffModBuf)
  pcall(vim.api.nvim_del_augroup_by_name, 'GitPanelDiffEdit')
  for _, buf in ipairs({ state.diffOrigBuf, state.diffModBuf }) do
    if buf and vim.api.nvim_buf_is_valid(buf) and vim.bo[buf].buftype ~= 'nofile' then
      vim.diagnostic.enable(true, { bufnr = buf })
    end
  end
end

-- collapses diff back to a single window, clears highlights, drops scratch buffers.
-- keeps the real working-file buffer alive (may be reopened normally).
-- keepWin: window to preserve as the editor (defaults to diffAreaWin).
function M.teardown(state, keepWin)
  hl.clear(state.diffOrigBuf)
  hl.clear(state.diffModBuf)
  pcall(vim.api.nvim_del_augroup_by_name, 'GitPanelDiffEdit')

  keepWin = keepWin or state.diffAreaWin
  for _, win in ipairs({ state.diffOrigWin, state.diffModWin }) do
    if win and win ~= keepWin and vim.api.nvim_win_is_valid(win) then
      pcall(vim.api.nvim_win_close, win, true)
    end
  end
  state.diffAreaWin = (keepWin and vim.api.nvim_win_is_valid(keepWin)) and keepWin or state.diffAreaWin
  state.diffOrigWin = nil
  state.diffModWin  = nil
  state.diffLayout  = nil

  for _, buf in ipairs({ state.diffOrigBuf, state.diffModBuf }) do
    if buf and vim.api.nvim_buf_is_valid(buf) and vim.bo[buf].buftype == 'nofile' then
      pcall(vim.api.nvim_buf_delete, buf, { force = true })
    end
  end
  state.diffOrigBuf = nil
  state.diffModBuf  = nil
  state.selected    = nil

  if state.diffAreaWin and vim.api.nvim_win_is_valid(state.diffAreaWin) then
    vim.wo[state.diffAreaWin].scrollbind = false
    vim.wo[state.diffAreaWin].cursorbind = false
    vim.wo[state.diffAreaWin].winfixbuf  = false -- callers (e.g. picker) are about to :edit into it
  end
end

local function makeNofileBuf(ft, name, lines)
  local buf = vim.api.nvim_create_buf(false, true)
  vim.bo[buf].buftype  = 'nofile'
  vim.bo[buf].swapfile = false
  if ft then vim.bo[buf].filetype = ft end
  vim.bo[buf].modifiable = true
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  vim.bo[buf].modifiable = false
  pcall(vim.api.nvim_buf_set_name, buf, name)
  return buf
end

local function setupHunkKeymaps(state)
  local hunk = require('git-panel.diff.hunk')
  local keyBufs = { state.diffModBuf }
  if state.diffOrigBuf then table.insert(keyBufs, state.diffOrigBuf) end
  for _, buf in ipairs(keyBufs) do
    if vim.api.nvim_buf_is_valid(buf) then
      local o = { buffer = buf, nowait = true, silent = true }
      vim.keymap.set({ 'n', 'v' }, '=', function() hunk.stageUnstage(state, 'stage') end, o)
      vim.keymap.set({ 'n', 'v' }, '-', function()
        if state.selected.group == 'staged' then hunk.stageUnstage(state, 'unstage')
        else hunk.discard(state) end
      end, o)
      -- when searching, go to next highlight instead of next diff
      local function nav(searchKey, dir)
        return function()
          -- stale pattern (not in this buffer) throws E486: fall through to hunk jump
          if require('find-replace').searching()
              and pcall(vim.cmd.normal, { searchKey, bang = true }) then
            return
          end
          hunk.gotoHunk(state, dir)
        end
      end
      vim.keymap.set('n', '<CR>', nav('n', 'next'), o)
      vim.keymap.set('n', '<S-CR>', nav('N', 'prev'), o)
    end
  end
end

-- renders a fetched diff (see diff/data.lua) into windows/buffers. synchronous
-- and self-contained, so it can never be interleaved with another render.
-- line: optional, lands the cursor there instead of on the first change (when
-- the modified side has that line)
local function commit(state, fetched, line)
  local oldOrigBuf, oldModBuf = state.diffOrigBuf, state.diffModBuf
  local absPath = state.gitRoot .. '/' .. fetched.path

  wins.lockBuffers(state, false) -- may be reusing windows locked by the previous render
  state.diffKind = fetched.kind

  if fetched.kind == 'deleted' then
    wins.ensureLayout(state, 'single')
    local buf = makeNofileBuf(fetched.ft, fetched.origRev .. ':' .. fetched.path, fetched.modLines)
    vim.api.nvim_win_set_buf(state.diffModWin, buf)
    state.diffOrigBuf, state.diffModBuf = nil, buf
    hl.markAllDeleted(buf, #fetched.modLines)

  elseif fetched.kind == 'binary' then
    wins.ensureLayout(state, 'single')
    local buf = makeNofileBuf(nil, fetched.path, fetched.modLines)
    vim.api.nvim_win_set_buf(state.diffModWin, buf)
    state.diffOrigBuf, state.diffModBuf = nil, buf

  elseif fetched.kind == 'new' then
    wins.ensureLayout(state, 'single')
    state.diffOrigBuf = nil
    local buf
    if fetched.useRealBuffer then
      buf = vim.fn.bufadd(absPath)
      vim.fn.bufload(buf)
    else
      buf = makeNofileBuf(fetched.ft, ':0:' .. fetched.path, fetched.modLines)
    end
    vim.api.nvim_win_set_buf(state.diffModWin, buf)
    state.diffModBuf = buf
    if line then hl.gotoLine(state, line) end

  else -- modified
    local origBuf = makeNofileBuf(fetched.ft, fetched.origRev .. ':' .. fetched.path, fetched.origLines)
    local modBuf, modLines
    if fetched.useRealBuffer then
      modBuf = vim.fn.bufadd(absPath)
      vim.fn.bufload(modBuf)
      modLines = vim.api.nvim_buf_get_lines(modBuf, 0, -1, false)
      hl.watchEdits(state, origBuf, modBuf)
    else
      modLines = fetched.modLines
      modBuf = makeNofileBuf(fetched.ft, ':0:' .. fetched.path, modLines)
    end

    hl.apply(origBuf, modBuf, fetched.origLines, modLines, state)

    wins.ensureLayout(state, 'double')
    vim.api.nvim_win_set_buf(state.diffOrigWin, origBuf)
    vim.api.nvim_win_set_buf(state.diffModWin, modBuf)
    state.diffOrigBuf, state.diffModBuf = origBuf, modBuf
    if line and line <= vim.api.nvim_buf_line_count(modBuf) then
      hl.gotoLine(state, line)
    else
      hl.gotoFirstChange(state)
    end
  end

  wins.lockBuffers(state, true)

  -- 30x faster
  if state.diffOrigBuf then vim.diagnostic.enable(false, { bufnr = state.diffOrigBuf }) end
  if state.diffModBuf  then vim.diagnostic.enable(false, { bufnr = state.diffModBuf }) end

  if oldOrigBuf and vim.api.nvim_buf_is_valid(oldOrigBuf) then
    pcall(vim.api.nvim_buf_delete, oldOrigBuf, { force = true })
  end
  if oldModBuf and vim.api.nvim_buf_is_valid(oldModBuf)
      and vim.bo[oldModBuf].buftype == 'nofile' then
    pcall(vim.api.nvim_buf_delete, oldModBuf, { force = true })
  end

  if fetched.kind ~= 'deleted' and fetched.kind ~= 'binary' then setupHunkKeymaps(state) end
end

-- fetch and render in one uninterrupted step: nothing (refresh, reload) can run
-- between a selection being made and its buffers existing
function M.open(state, line)
  commit(state, data.fetch(state, state.selected), line)
end

-- refreshes the rendered diff. a file can change kind under the same path
-- (untracked -> modified, ...), and then the buffers/layout must be rebuilt.
function M.reload(state)
  local fetched = data.fetch(state, state.selected)
  if fetched.kind == state.diffKind then
    hl.reload(state, fetched)
  else
    commit(state, fetched)
  end
end

return M
