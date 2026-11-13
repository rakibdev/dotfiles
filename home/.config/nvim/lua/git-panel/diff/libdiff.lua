local M = {}

function M.computeDiff(originalLines, modifiedLines, options)
  local origText = table.concat(originalLines, '\n')
  local modText  = table.concat(modifiedLines, '\n')
  if #originalLines > 0 then origText = origText .. '\n' end
  if #modifiedLines > 0 then modText  = modText .. '\n' end

  local hunks = vim.diff(origText, modText, {
    result_type       = 'indices',
    algorithm         = 'histogram',
    ignore_whitespace = options and options.ignore_trim_whitespace,
  }) or {}

  local changes = {}
  for _, hunk in ipairs(hunks) do
    local origStart, origCount, modStart, modCount = hunk[1], hunk[2], hunk[3], hunk[4]
    local oStart = origCount == 0 and (origStart + 1) or origStart
    local oEnd   = origCount == 0 and (origStart + 1) or (origStart + origCount)
    local mStart = modCount == 0 and (modStart + 1) or modStart
    local mEnd   = modCount == 0 and (modStart + 1) or (modStart + modCount)

    table.insert(changes, {
      original = { start_line = oStart, end_line = oEnd },
      modified = { start_line = mStart, end_line = mEnd },
    })
  end

  return { changes = changes, moves = {}, hit_timeout = false }
end

return M
