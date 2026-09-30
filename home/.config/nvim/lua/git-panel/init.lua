local M = {}

-- git-mode is a layout swap inside the current tab, never a second tab: the
-- snacks explorer gives way to the git explorer, and the editor window turns
-- into the diff area. with no foreign windows, nothing can focus its way into
-- git-mode by window id.
M._state = nil

local function newState(gitRoot)
  return {
    gitRoot          = gitRoot,
    explorerWin      = nil,
    explorerBuf      = nil,
    diffAreaWin      = nil,
    diffOrigWin      = nil,
    diffModWin       = nil,
    diffLayout       = nil,
    diffOrigBuf      = nil,
    diffModBuf       = nil,
    commitWin        = nil,
    commitBuf        = nil,
    status           = { files = {}, conflicts = {} },
    lineMap          = {},
    selected         = nil,
    fsWatches        = {},
    refreshDebounce  = nil,
    snap             = nil, -- what to restore on exit, see open()
  }
end

local function alive(win)
  return win ~= nil and vim.api.nvim_win_is_valid(win)
end

-- on while any window we own exists. dies with the windows, so it can't go
-- stale (the sidebar can be hidden with <C-b> while git-mode stays on).
function M.isActive()
  local s = M._state
  return s ~= nil and (alive(s.diffAreaWin) or alive(s.diffModWin)
    or alive(s.diffOrigWin) or alive(s.explorerWin))
end

function M.refreshIfOpen()
  if M.isActive() then
    require('git-panel.explorer').refresh(M._state)
  end
end

local function readable(path)
  return path ~= nil and path ~= '' and vim.fn.filereadable(path) == 1
end

-- leaves git-mode: tears down the sidebar and diff, and puts the editor window
-- back to a single normal view.
--   diff open  -> shows its file (the normal version), on the same line.
--                 opts.carry == false shows the file you entered with instead.
--   no diff    -> the window already holds your file, untouched.
function M.close(opts)
  if not M.isActive() then return end

  local state    = M._state
  local carry    = not (opts and opts.carry == false)
  local snap     = state.snap or {}
  local diff     = require('git-panel.diff')
  local wins     = require('git-panel.diff.windows')
  local pickerUtil = require('utils.picker')

  local editorWin
  for _, win in ipairs({ state.diffAreaWin, state.diffModWin, state.diffOrigWin }) do
    if alive(win) then editorWin = win break end
  end
  editorWin = editorWin or pickerUtil.editorWin()

  local hadDiff = state.selected ~= nil
  local file = hadDiff and (state.gitRoot .. '/' .. state.selected.entry.path) or nil
  -- both panes are cursorbind'd, so the modified pane's line is the line you
  -- were looking at regardless of which side had focus
  local line = alive(state.diffModWin) and vim.api.nvim_win_get_cursor(state.diffModWin)[1] or nil

  local target = nil
  if hadDiff then
    target = (carry and readable(file)) and file or snap.file
  end

  require('git-panel.explorer.watcher').stop(state)
  diff.detach(state)
  require('git-panel.explorer').closeWin(state)

  if editorWin then
    if hadDiff then
      -- put a real buffer in the window BEFORE teardown deletes the scratch
      -- ones (a staged diff shows the index in a scratch buffer, and deleting a
      -- buffer closes the windows showing it)
      wins.lockBuffers(state, false)
      vim.api.nvim_win_call(editorWin, function()
        if readable(target) then
          vim.api.nvim_win_set_buf(0, vim.fn.bufadd(target))
          vim.fn.bufload(vim.api.nvim_win_get_buf(0))
        else
          vim.cmd.enew()
        end
      end)
    end
    diff.teardown(state, editorWin)
    if snap.signcolumn then vim.wo[editorWin].signcolumn = snap.signcolumn end
    vim.api.nvim_set_current_win(editorWin)

    if hadDiff and target == file and line then
      -- staged diffs render the index, which can be longer than the file
      local clamped = math.max(1, math.min(line, vim.api.nvim_buf_line_count(0)))
      vim.api.nvim_win_set_cursor(editorWin, { clamped, 0 })
      vim.cmd('normal! zz')
    end
  end

  require('utils.git').locked       = false
  require('statusbar').fileProvider = nil
  state.diffAreaWin, state.diffModWin, state.diffOrigWin = nil, nil, nil
  state.snap = nil

  if snap.explorerOpen and editorWin then
    local revealFile = vim.api.nvim_buf_get_name(0)
    -- focus = false: snacks focuses the explorer once it shows, which happens
    -- after this function returns, so refocusing the editor here would lose
    Snacks.explorer.open({
      focus   = false,
      on_show = function(picker)
        require('utils.sidebar').apply(picker.list.win.win)
        if revealFile ~= '' then Snacks.explorer.reveal({ file = revealFile }) end
      end,
    })
  end
end

function M.toggle()
  if M.isActive() then
    M.close()
  else
    M.open()
  end
end

function M.open()
  if M.isActive() then return end

  local gitUtil = require('utils.git')
  local root = gitUtil.getActiveRoot()
  if not root then
    vim.notify('No git repos found', vim.log.levels.WARN)
    return
  end

  local pickerUtil = require('utils.picker')
  local editorWin  = pickerUtil.editorWin()
  local editorFile = editorWin and vim.api.nvim_buf_get_name(vim.api.nvim_win_get_buf(editorWin)) or nil
  if not readable(editorFile) then editorFile = nil end

  local snap = {
    file        = editorFile,
    explorerOpen = #Snacks.picker.get({ source = 'explorer' }) > 0,
    signcolumn  = editorWin and vim.wo[editorWin].signcolumn or nil,
  }

  -- the snacks explorer gives way to the git explorer
  for _, picker in ipairs(Snacks.picker.get({ source = 'explorer' })) do
    picker:close()
  end
  if not editorWin then
    vim.cmd('botright vnew')
    editorWin = vim.api.nvim_get_current_win()
    snap.signcolumn = vim.wo[editorWin].signcolumn
  end

  local state = M._state or newState(root)
  M._state = state
  state.gitRoot = root
  state.snap = snap
  -- opens that file's diff if it has one, on the line you were on; otherwise
  -- the file stays as it is
  local preselectPath = editorFile or gitUtil.activeFile
  state.preselect = preselectPath and {
    path = preselectPath,
    line = editorFile and vim.api.nvim_win_get_cursor(editorWin)[1] or nil,
  } or nil

  gitUtil.activeRoot = root
  gitUtil.locked     = true
  require('statusbar').fileProvider = function()
    if not state.selected then return nil end
    local path    = state.selected.entry.path
    local absPath = state.gitRoot .. '/' .. path
    local buf     = vim.fn.bufnr(absPath)
    local isModified = buf > 0 and vim.api.nvim_buf_is_loaded(buf) and vim.bo[buf].modified
    return path, isModified
  end

  vim.api.nvim_set_current_win(editorWin)
  state.diffAreaWin = editorWin
  vim.cmd('topleft vsplit')
  state.explorerWin = vim.api.nvim_get_current_win()

  require('git-panel.explorer').init(state)
end

return M
