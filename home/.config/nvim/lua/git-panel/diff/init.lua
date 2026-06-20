local M = {}
local hl   = require('git-panel.diff.highlights')
local wins = require('git-panel.diff.windows')

function M.reload(state) hl.reload(state) end

function M.clear(state)
  hl.clear(state.diffOrigBuf)
  hl.clear(state.diffModBuf)
end

-- collapses diff back to a single window, clears highlights, drops scratch buffers.
-- keeps the real working-file buffer alive (may be reopened normally).
-- keepWin: window to preserve as the editor (defaults to diffAreaWin).
function M.teardown(state, keepWin)
  hl.clear(state.diffOrigBuf)
  hl.clear(state.diffModBuf)
  pcall(vim.api.nvim_del_augroup_by_name, 'GitPanelSync')
  pcall(vim.api.nvim_del_augroup_by_name, 'GitPanelDiffEdit')
  pcall(vim.api.nvim_del_augroup_by_name, 'GitPanelDiffOwn')

  keepWin = keepWin or state.diffAreaWin
  for _, win in ipairs({ state.diffOrigWin, state.diffModWin }) do
    if win and win ~= keepWin and vim.api.nvim_win_is_valid(win) then
      pcall(vim.api.nvim_win_close, win, true)
    end
  end
  state.diffAreaWin = (keepWin and vim.api.nvim_win_is_valid(keepWin)) and keepWin or state.diffAreaWin
  state.diffOrigWin = nil
  state.diffModWin  = nil

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
  end
end

function M.open(state)
  state.opening   = true
  local sel       = state.selected
  local path      = sel.entry.path
  local absPath   = state.gitRoot .. '/' .. path
  local status    = sel.entry.status
  local isStaged  = sel.group == 'staged'
  local isNew     = status == 'A' or status == '??'
  local isDeleted = status == 'D'
  local isSingle  = isNew or isDeleted
  local ft        = vim.filetype.match({ filename = path })

  wins.ensureDiffArea(state)
  if isSingle then wins.setupSingle(state) else wins.setupDouble(state) end

  local oldOrigBuf = state.diffOrigBuf
  local oldModBuf  = state.diffModBuf

  local function makeNofileBuf(name)
    local buf = vim.api.nvim_create_buf(false, true)
    vim.bo[buf].buftype    = 'nofile'
    vim.bo[buf].swapfile   = false
    vim.bo[buf].modifiable = false
    pcall(vim.api.nvim_buf_set_name, buf, name)
    if ft then vim.bo[buf].filetype = ft end
    return buf
  end

  local origRev = isStaged and 'HEAD' or ':0'

  if isDeleted then
    local buf = makeNofileBuf(origRev .. ':' .. path)
    vim.api.nvim_win_set_buf(state.diffModWin, buf)
    state.diffOrigBuf = nil
    state.diffModBuf  = buf
  elseif isNew then
    state.diffOrigBuf = nil
    if isStaged then
      local buf = makeNofileBuf(':0:' .. path)
      vim.api.nvim_win_set_buf(state.diffModWin, buf)
      state.diffModBuf = buf
    else
      local buf = vim.fn.bufadd(absPath)
      vim.fn.bufload(buf)
      vim.api.nvim_win_set_buf(state.diffModWin, buf)
      state.diffModBuf = buf
    end
  else
    local origBuf = makeNofileBuf(origRev .. ':' .. path)
    vim.api.nvim_win_set_buf(state.diffOrigWin, origBuf)
    state.diffOrigBuf = origBuf

    if isStaged then
      local modBuf = makeNofileBuf(':0:' .. path)
      vim.api.nvim_win_set_buf(state.diffModWin, modBuf)
      state.diffModBuf = modBuf
    else
      local modBuf = vim.fn.bufadd(absPath)
      vim.fn.bufload(modBuf)
      vim.api.nvim_win_set_buf(state.diffModWin, modBuf)
      state.diffModBuf = modBuf
      hl.watchEdits(state, origBuf, modBuf)
    end
  end

  if oldOrigBuf and vim.api.nvim_buf_is_valid(oldOrigBuf) then
    pcall(vim.api.nvim_buf_delete, oldOrigBuf, { force = true })
  end
  if oldModBuf and vim.api.nvim_buf_is_valid(oldModBuf)
      and vim.bo[oldModBuf].buftype == 'nofile' then
    pcall(vim.api.nvim_buf_delete, oldModBuf, { force = true })
  end

  if not isDeleted then
    local hunk = require('git-panel.diff.hunk')
    local keyBufs = { state.diffModBuf }
    if state.diffOrigBuf then table.insert(keyBufs, state.diffOrigBuf) end
    for _, buf in ipairs(keyBufs) do
      if vim.api.nvim_buf_is_valid(buf) then
        local o = { buffer = buf, nowait = true, silent = true }
        vim.keymap.set({ 'n', 'v' }, '=', function() hunk.stageUnstage(state, 'stage') end, o)
        vim.keymap.set({ 'n', 'v' }, '-', function() hunk.stageUnstage(state, 'unstage') end, o)
        vim.keymap.set({ 'n', 'v' }, '_', function() hunk.discard(state) end, o)
        vim.keymap.set('n', '<CR>', function() hunk.gotoHunk(state, 'next') end, o)
        vim.keymap.set('n', '<S-CR>', function() hunk.gotoHunk(state, 'prev') end, o)
      end
    end
  end

  -- self-cleanup: if a foreign buffer is opened into either diff window
  -- (ctrl+p, explorer, grep), collapse the diff back to a single window.
  vim.api.nvim_create_autocmd('BufWinEnter', {
    group = vim.api.nvim_create_augroup('GitPanelDiffOwn', { clear = true }),
    callback = function(ev)
      if state.opening then return end
      local win = vim.fn.bufwinid(ev.buf)
      if win ~= state.diffOrigWin and win ~= state.diffModWin then return end
      if ev.buf == state.diffOrigBuf or ev.buf == state.diffModBuf then return end
      M.teardown(state, win)
    end,
  })

  hl.reload(state, true)
  vim.schedule(function() state.opening = false end)
end

return M
