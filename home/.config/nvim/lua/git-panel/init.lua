local M = {}

M._state = nil

local function newState(gitRoot)
  return {
    gitRoot          = gitRoot,
    tab              = nil,
    origShowtabline  = vim.o.showtabline,
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
  if M._state and M._state.tab and vim.api.nvim_tabpage_is_valid(M._state.tab) then
    require('git-panel.explorer').refresh(M._state)
  end
end

function M.open()
  if M._state and M._state.tab and vim.api.nvim_tabpage_is_valid(M._state.tab) then
    if vim.api.nvim_get_current_tabpage() == M._state.tab then
      vim.cmd('tabclose')
    else
      vim.api.nvim_set_current_tabpage(M._state.tab)
    end
    return
  end

  local gitUtil = require('utils.git')
  local root = gitUtil.getActiveRoot()
  if not root then
    vim.notify('No git repos found', vim.log.levels.WARN)
    return
  end

  gitUtil.pinnedRoot = root
  local currentFile = vim.fn.expand('%:p')
  local state = newState(root)
  state.preselect = (currentFile ~= '' and vim.fn.filereadable(currentFile) == 1) and currentFile or nil
  require('statusbar').fileProvider = function()
    if not state.selected then return nil end
    local path    = state.selected.entry.path
    local absPath = state.gitRoot .. '/' .. path
    local buf     = vim.fn.bufnr(absPath)
    local isModified = buf > 0 and vim.api.nvim_buf_is_loaded(buf) and vim.bo[buf].modified
    return path, isModified
  end
  M._state = state

  vim.o.showtabline = 0
  vim.cmd('tabnew')
  state.tab = vim.api.nvim_get_current_tabpage()
  state.diffAreaWin = vim.api.nvim_get_current_win()

  vim.cmd('leftabove vsplit')
  state.explorerWin = vim.api.nvim_get_current_win()

  require('git-panel.diff')
  require('git-panel.explorer').init(state)

  vim.api.nvim_create_autocmd('TabClosed', {
    group = vim.api.nvim_create_augroup('GitPanelTabClose', { clear = true }),
    callback = function()
      vim.o.showtabline = state.origShowtabline
      require('git-panel.explorer.watcher').stop(state)
      pcall(vim.api.nvim_del_augroup_by_name, 'GitPanelRefresh')
      require('utils.git').pinnedRoot   = nil
      require('statusbar').fileProvider = nil
      M._state = nil
    end,
    once = true,
  })
end

return M
