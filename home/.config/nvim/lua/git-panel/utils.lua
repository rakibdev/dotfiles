local M = {}

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

local cache = {}

local function runGitAsync(args, opts)
  opts = opts or {}
  local thread = coroutine.running()
  assert(thread, "runGitAsync must be run within a coroutine")

  if opts.cwd and vim.fn.isdirectory(opts.cwd) == 0 then
    return "Directory does not exist: " .. opts.cwd
  end

  vim.system(vim.list_extend({ "git" }, args), {
    cwd = opts.cwd,
    text = true,
  }, function(result)
    vim.schedule(function()
      if result.code == 0 then
        coroutine.resume(thread, nil, result.stdout or "")
      else
        local errMsg = (result.stderr and result.stderr ~= '') and result.stderr:gsub('%s+$', '') or 'Error'
        coroutine.resume(thread, errMsg)
      end
    end)
  end)

  return coroutine.yield()
end

function M.async(fn)
  return function(...)
    local thread = coroutine.create(fn)
    local ok, err = coroutine.resume(thread, ...)
    if not ok then
      error(err)
    end
  end
end

function M.getFileContent(revision, gitRoot, relPath)
  local isMutable = revision:match("^:[0-3]$")
  if not isMutable then
    local key = gitRoot .. ":::" .. revision .. ":::" .. relPath
    local entry = cache[key]
    if entry then
      return nil, vim.list_extend({}, entry)
    end
  end

  local gitObject = revision .. ":" .. relPath
  local err, output = runGitAsync({ "show", gitObject }, { cwd = gitRoot })
  if err then
    return err
  end

  local lines = vim.split(output, "\n")
  if lines[#lines] == "" then
    table.remove(lines, #lines)
  end

  if not isMutable then
    local key = gitRoot .. ":::" .. revision .. ":::" .. relPath
    cache[key] = vim.list_extend({}, lines)
  end
  return nil, lines
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

function M.getStatus(gitRoot)
  local err, porcelainOut = runGitAsync({ "status", "--porcelain", "-uall", "-M" }, { cwd = gitRoot })
  if err then return err end

  local err2, unstagedOut = runGitAsync({ "diff", "--numstat" }, { cwd = gitRoot })
  if err2 then return err2 end

  local err3, stagedOut = runGitAsync({ "diff", "--cached", "--numstat" }, { cwd = gitRoot })
  if err3 then return err3 end

  local unstagedStats = parseNumstat(unstagedOut or "")
  local stagedStats = parseNumstat(stagedOut or "")

  local result = { files = {}, conflicts = {} }

  for line in porcelainOut:gmatch("[^\r\n]+") do
    if #line >= 3 then
      local indexStatus = line:sub(1, 1)
      local worktreeStatus = line:sub(2, 2)
      local pathPart = unquotePath(line:sub(4))

      local oldPath, newPath = pathPart:match("^(.+) %-> (.+)$")
      local path = oldPath and newPath or pathPart
      local isRename = oldPath ~= nil

      local fullPath = gitRoot .. "/" .. path:gsub("/+$", "")
      local isSubmodule = require("utils.git").repos[fullPath] or vim.uv.fs_stat(fullPath .. "/.git")

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
            table.insert(result.files, {
              path = path,
              status = indexStatus,
              oldPath = isRename and oldPath or nil,
              added = s.added,
              deleted = s.deleted,
              group = 'staged',
            })
          end

          if worktreeStatus ~= " " then
            local s = unstagedStats[path] or {}
            table.insert(result.files, {
              path = path,
              status = worktreeStatus == "?" and "??" or worktreeStatus,
              oldPath = isRename and oldPath or nil,
              added = s.added,
              deleted = s.deleted,
              group = 'unstaged',
            })
          end
        end
      end
    end
  end
  return nil, result
end

function M.clearCache()
  cache = {}
end

function M.stageFile(gitRoot, relPath)
  cache = {}
  local err = runGitAsync({ "add", "--", relPath }, { cwd = gitRoot })
  return err
end

function M.unstageFile(gitRoot, relPath)
  cache = {}
  local err = runGitAsync({ "reset", "HEAD", "--", relPath }, { cwd = gitRoot })
  return err
end

function M.stageAll(gitRoot)
  cache = {}
  local err = runGitAsync({ "add", "-A" }, { cwd = gitRoot })
  return err
end

function M.unstageAll(gitRoot)
  cache = {}
  local err = runGitAsync({ "reset", "HEAD" }, { cwd = gitRoot })
  return err
end

function M.commit(gitRoot, msg)
  local err = runGitAsync({ "commit", "-m", msg }, { cwd = gitRoot })
  return err
end

function M.push(gitRoot)
  local err = runGitAsync({ "push" }, { cwd = gitRoot })
  return err
end

return M
