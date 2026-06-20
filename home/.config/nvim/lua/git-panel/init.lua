local M = {}

M._state = nil
M.active = false

local function closeSnacksSidebar()
  for _, picker in ipairs(Snacks.picker.get({ source = 'explorer' })) do
    picker:close()
  end
end

local function newState(gitRoot)
  return {
    gitRoot          = gitRoot,
    explorerWin      = nil,
    explorerBuf      = nil,
    diffAreaWin      = nil,
    diffOrigWin      = nil,
    diffModWin       = nil,
    diffOrigBuf      = nil,
    diffModBuf       = nil,
    commitWin        = nil,
    commitBuf        = nil,
    status           = { files = {}, conflicts = {} },
    lineMap          = {},
    selected         = nil,
    fsWatches        = {},
    refreshDebounce  = nil,
  }
end

function M.refreshIfOpen()
  if M.active and M._state then
    require('git-panel.explorer').refresh(M._state)
  end
end

local function exit()
  local state = M._state
  require('git-panel.explorer').closeWin(state)
  require('git-panel.explorer.watcher').stop(state)
  require('utils.git').locked       = false
  require('statusbar').fileProvider = nil
  M.active = false
  vim.schedule(function() Snacks.explorer.open() end)
end

function M.open()
  if M.active then
    exit()
    return
  end

  local gitUtil = require('utils.git')
  local root = gitUtil.getActiveRoot()
  if not root then
    vim.notify('No git repos found', vim.log.levels.WARN)
    return
  end

  gitUtil.activeRoot = root
  gitUtil.locked     = true
  local currentFile  = vim.fn.expand('%:p')
  local lastFile     = gitUtil.activeFile
  local firstOpen    = not M._state
  local state        = M._state or newState(root)
  state.gitRoot      = root
  -- preselect only on first open; re-entering git-mode must not touch the main buffer
  if firstOpen then
    state.preselect = (currentFile ~= '' and vim.fn.filereadable(currentFile) == 1) and currentFile or lastFile
  end
  require('statusbar').fileProvider = function()
    if not state.selected then return nil end
    local path    = state.selected.entry.path
    local absPath = state.gitRoot .. '/' .. path
    local buf     = vim.fn.bufnr(absPath)
    local isModified = buf > 0 and vim.api.nvim_buf_is_loaded(buf) and vim.bo[buf].modified
    return path, isModified
  end
  M._state = state
  M.active = true

  closeSnacksSidebar()

  -- picker:close() defers its window teardown via vim.schedule; queue ours
  -- after so the snacks sidebar is gone before we capture/split windows,
  -- else explorer can land between diff columns or duplicate the sidebar
  vim.schedule(function()
    state.diffAreaWin = require('git-panel.diff.windows').editorWin(state)
    vim.api.nvim_set_current_win(state.diffAreaWin)

    vim.cmd('topleft vsplit')
    state.explorerWin = vim.api.nvim_get_current_win()

    require('git-panel.diff')
    require('git-panel.explorer').init(state)
  end)
end

return M
