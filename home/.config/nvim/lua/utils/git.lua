local M = {}

M.repos       = {}
M.activeRoot  = nil
M.activeFile  = nil
M.locked      = false  -- prevents BufEnter from overwriting activeRoot while git-panel is open

local function updateActiveRoot()
  if M.locked then return end
  local file = vim.fn.expand('%:p')
  if file == '' then return end
  local root = M.gitRoot(vim.fn.fnamemodify(file, ':h'))
  if root then M.activeRoot = root end
end

local grp = vim.api.nvim_create_augroup('GitActiveRoot', { clear = true })
vim.api.nvim_create_autocmd('VimEnter', { group = grp, once = true, callback = updateActiveRoot })
vim.api.nvim_create_autocmd('BufEnter', { group = grp, callback = updateActiveRoot })

function M.scanRepos()
  local cwd = vim.fn.getcwd()
  vim.system(
    { 'find', '.', '-maxdepth', '3', '-name', '.git', '-type', 'd', '-not', '-path', '*/.git/*' },
    { cwd = cwd, text = true },
    function(result)
      if result.code ~= 0 then return end
      for line in (result.stdout or ''):gmatch('[^\n]+') do
        local rel = line:gsub('/%.git$', ''):gsub('^%./?', '')
        local root = rel == '' and cwd or (cwd .. '/' .. rel)
        M.repos[root] = true
      end
    end
  )
end

function M.gitRoot(dir)
  dir = (dir or vim.fn.expand('%:p:h')):gsub('/$', '')
  local best
  for root in pairs(M.repos) do
    if dir == root or vim.startswith(dir, root .. '/') then
      if not best or #root > #best then best = root end
    end
  end
  return best
end

function M.repoList()
  local list = vim.tbl_keys(M.repos)
  table.sort(list)
  return list
end

function M.getActiveRoot()
  return M.activeRoot or M.repoList()[1]
end

function M.getBranch(root)
  root = root or M.getActiveRoot()
  if not root then return nil end
  local branch = vim.fn.systemlist(
    'git -C ' .. vim.fn.shellescape(root) .. ' rev-parse --abbrev-ref HEAD'
  )[1]
  return (vim.v.shell_error == 0 and branch ~= 'HEAD') and branch or nil
end

M.scanRepos()

local cache = {}

local function runGitAsync(args, opts, callback)
  opts = opts or {}
  if opts.cwd and vim.fn.isdirectory(opts.cwd) == 0 then
    callback("Directory does not exist: " .. opts.cwd)
    return
  end

  vim.system(vim.list_extend({ "git" }, args), {
    cwd = opts.cwd,
    text = true,
  }, function(result)
    if result.code == 0 then
      callback(nil, result.stdout or "")
    else
      local errMsg = (result.stderr and result.stderr ~= '') and result.stderr:gsub('%s+$', '') or 'Error'
      callback(errMsg)
    end
  end)
end

local function unquotePath(path)
  if path:sub(1, 1) == '"' and path:sub(-1) == '"' then
    local unquoted = path:sub(2, -2)
    unquoted = unquoted:gsub("\\(.)", function(char)
      local escapes = { a = "\a", b = "\b", t = "\t", n = "\n", v = "\v", f = "\f", r = "\r", ["\\"] = "\\", ['"'] = '"' }
      return escapes[char] or char
    end)
    return unquoted
  end
  return path
end

local function isConflictStatus(indexStatus, worktreeStatus)
  if indexStatus == "U" or worktreeStatus == "U" then return true end
  if indexStatus == "A" and worktreeStatus == "A" then return true end
  if indexStatus == "D" and worktreeStatus == "D" then return true end
  return false
end

local function parseNumstat(output)
  local stats = {}
  for line in output:gmatch("[^\r\n]+") do
    local added, deleted, path = line:match("^(%d+)%s+(%d+)%s+(.+)$")
    if path then
      stats[unquotePath(path)] = { added = tonumber(added), deleted = tonumber(deleted) }
    end
  end
  return stats
end

function M.getStatus(gitRoot, callback)
  local pending = 3
  local porcelainOut, unstagedStats, stagedStats
  local firstErr

  local function done()
    pending = pending - 1
    if pending > 0 then return end
    if firstErr then callback(firstErr); return end

    local result = { unstaged = {}, staged = {}, conflicts = {} }

    for line in porcelainOut:gmatch("[^\r\n]+") do
      if #line >= 3 then
        local indexStatus = line:sub(1, 1)
        local worktreeStatus = line:sub(2, 2)
        local pathPart = unquotePath(line:sub(4))

        local oldPath, newPath = pathPart:match("^(.+) %-> (.+)$")
        local path = oldPath and newPath or pathPart
        local isRename = oldPath ~= nil

        local fullPath = gitRoot .. "/" .. path:gsub("/+$", "")
        local isSubmodule = M.repos[fullPath] or vim.uv.fs_stat(fullPath .. "/.git")

        if not isSubmodule then
          if isConflictStatus(indexStatus, worktreeStatus) then
            table.insert(result.conflicts, {
              path = path,
              status = "!",
              conflictType = indexStatus .. worktreeStatus,
            })
          else
            if indexStatus ~= " " and indexStatus ~= "?" then
              local s = stagedStats[path] or {}
              table.insert(result.staged, {
                path = path,
                status = indexStatus,
                oldPath = isRename and oldPath or nil,
                added = s.added,
                deleted = s.deleted,
              })
            end

            if worktreeStatus ~= " " then
              local s = unstagedStats[path] or {}
              table.insert(result.unstaged, {
                path = path,
                status = worktreeStatus == "?" and "??" or worktreeStatus,
                oldPath = isRename and oldPath or nil,
                added = s.added,
                deleted = s.deleted,
              })
            end
          end
        end
      end
    end
    callback(nil, result)
  end

  runGitAsync({ "status", "--porcelain", "-uall", "-M" }, { cwd = gitRoot }, function(err, out)
    if err and not firstErr then firstErr = err end
    porcelainOut = out or ""
    done()
  end)
  runGitAsync({ "diff", "--numstat" }, { cwd = gitRoot }, function(err, out)
    if err and not firstErr then firstErr = err end
    unstagedStats = parseNumstat(out or "")
    done()
  end)
  runGitAsync({ "diff", "--cached", "--numstat" }, { cwd = gitRoot }, function(err, out)
    if err and not firstErr then firstErr = err end
    stagedStats = parseNumstat(out or "")
    done()
  end)
end

function M.clearCache()
  cache = {}
end

function M.stageFile(gitRoot, relPath, callback)
  cache = {}
  runGitAsync({ "add", "--", relPath }, { cwd = gitRoot }, function(err)
    if err then callback(err) else callback() end
  end)
end

function M.unstageFile(gitRoot, relPath, callback)
  cache = {}
  runGitAsync({ "reset", "HEAD", "--", relPath }, { cwd = gitRoot }, function(err)
    if err then callback(err) else callback() end
  end)
end

function M.stageAll(gitRoot, callback)
  cache = {}
  runGitAsync({ "add", "-A" }, { cwd = gitRoot }, function(err)
    if err then callback(err) else callback() end
  end)
end

function M.unstageAll(gitRoot, callback)
  cache = {}
  runGitAsync({ "reset", "HEAD" }, { cwd = gitRoot }, function(err)
    if err then callback(err) else callback() end
  end)
end

function M.commit(gitRoot, msg, callback)
  runGitAsync({ "commit", "-m", msg }, { cwd = gitRoot }, function(err)
    if err then callback(err) else callback() end
  end)
end

function M.push(gitRoot, callback)
  runGitAsync({ "push" }, { cwd = gitRoot }, function(err)
    if err then callback(err) else callback() end
  end)
end

function M.getFileContent(revision, gitRoot, relPath, callback)
  local isMutable = revision:match("^:[0-3]$")
  if not isMutable then
    local key = gitRoot .. ":::" .. revision .. ":::" .. relPath
    local entry = cache[key]
    if entry then
      callback(nil, vim.list_extend({}, entry))
      return
    end
  end

  local gitObject = revision .. ":" .. relPath
  runGitAsync({ "show", gitObject }, { cwd = gitRoot }, function(err, output)
    if err then
      if err:match("does not exist") or err:match("exists on disk, but not in") then
        callback(string.format("File '%s' not found in revision '%s'", relPath, revision))
      else
        callback(err)
      end
      return
    end

    local lines = vim.split(output, "\n")
    if lines[#lines] == "" then
      table.remove(lines, #lines)
    end

    if not isMutable then
      local key = gitRoot .. ":::" .. revision .. ":::" .. relPath
      cache[key] = vim.list_extend({}, lines)
    end
    callback(nil, lines)
  end)
end

return M
