local M = {}

local gitDirCache = {}

local function getGitDir(gitRoot)
  if gitDirCache[gitRoot] then
    return gitDirCache[gitRoot]
  end
  local res = vim.fn.systemlist({ 'git', '-C', gitRoot, 'rev-parse', '--git-dir' })
  if vim.v.shell_error ~= 0 or #res == 0 then return nil end
  local gitDir = res[1]
  if not gitDir:match('^/') then
    gitDir = gitRoot .. '/' .. gitDir
  end
  gitDirCache[gitRoot] = gitDir
  return gitDir
end

function M.stop(state)
  if state.fsWatches then
    for _, handle in ipairs(state.fsWatches) do
      if handle and not handle:is_closing() then
        pcall(function() handle:close() end)
      end
    end
    state.fsWatches = {}
  end

  if state.refreshDebounce then
    if not state.refreshDebounce:is_closing() then
      pcall(function()
        state.refreshDebounce:stop()
        state.refreshDebounce:close()
      end)
    end
    state.refreshDebounce = nil
  end
end

function M.start(state)
  -- Stop any existing watches for the previous repository
  if state.fsWatches then
    for _, handle in ipairs(state.fsWatches) do
      if handle and not handle:is_closing() then
        pcall(function() handle:close() end)
      end
    end
    state.fsWatches = {}
  end

  -- Stop (but don't destroy) the timer if it is running
  if state.refreshDebounce and not state.refreshDebounce:is_closing() then
    pcall(function() state.refreshDebounce:stop() end)
  end

  local gitDir = getGitDir(state.gitRoot)
  if not gitDir then return end

  local function scheduleRefresh()
    local timer = state.refreshDebounce
    if not timer or timer:is_closing() then
      timer = vim.uv.new_timer()
      state.refreshDebounce = timer
    else
      timer:stop()
    end
    timer:start(300, 0, vim.schedule_wrap(function()
      require('git-panel.explorer').refresh(state)
    end))
  end

  local function startWatch(path)
    local handle = vim.uv.new_fs_event()
    if not handle then return nil end
    local ok = pcall(function()
      handle:start(path, {}, function(err)
        if not err then scheduleRefresh() end
      end)
    end)
    if ok then
      return handle
    end
    pcall(function() handle:close() end)
    return nil
  end

  state.fsWatches = {}
  local indexPath = gitDir .. '/index'
  local headPath = gitDir .. '/HEAD'

  local indexHandle = startWatch(indexPath)
  if indexHandle then table.insert(state.fsWatches, indexHandle) end

  local headHandle = startWatch(headPath)
  if headHandle then table.insert(state.fsWatches, headHandle) end
end

return M
