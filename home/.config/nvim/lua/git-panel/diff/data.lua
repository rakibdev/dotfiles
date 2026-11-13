-- pure data fetching for a diff selection: talks to git, touches nothing in
-- `state` and creates no buffers/windows. blocking, so callers get the data
-- and render it in one uninterrupted step.
local git    = require('git-panel.utils')
local binary = require('utils.binary')

local M = {}

function M.fetch(state, sel)
  local path      = sel.entry.path
  local status    = sel.entry.status
  local isStaged  = sel.group == 'staged'
  local isNew     = status == 'A' or status == '??'
  local isDeleted = status == 'D'
  local origRev   = isStaged and 'HEAD' or ':0'
  local ft        = vim.filetype.match({ filename = path })

  if binary.isBinary(path) then
    return { kind = 'binary', path = path, modLines = binary.placeholder(state.gitRoot .. '/' .. path) }
  end

  if isDeleted then
    local _, lines = git.getFileContent(origRev, state.gitRoot, path)
    return { kind = 'deleted', path = path, origRev = origRev, ft = ft, modLines = lines or {} }
  end

  if isNew then
    if isStaged then
      local _, idxLines = git.getFileContent(':0', state.gitRoot, path)
      return { kind = 'new', path = path, ft = ft, modLines = idxLines or {} }
    end
    -- unstaged new file: content comes straight from the real buffer, no git needed
    return { kind = 'new', path = path, ft = ft, useRealBuffer = true }
  end

  local _, origLines = git.getFileContent(origRev, state.gitRoot, path)
  local modLines
  if isStaged then
    local _, idxLines = git.getFileContent(':0', state.gitRoot, path)
    modLines = idxLines or {}
  end
  return {
    kind         = 'modified',
    path         = path,
    origRev      = origRev,
    ft           = ft,
    origLines    = origLines or {},
    modLines     = modLines, -- nil when unstaged, filled in from the real buffer at render time
    useRealBuffer = not isStaged,
  }
end

return M
