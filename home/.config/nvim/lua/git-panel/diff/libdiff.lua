local M = {}
local ffi = require("ffi")

local VERSION = "2.45.0"

local function detectArch()
  local machine = vim.loop.os_uname().machine:lower()
  if machine:match("x86_64") or machine:match("amd64") or machine:match("x64") then return "x64" end
  if machine:match("aarch64") or machine:match("arm64") then return "arm64" end
end

local libDir = vim.fn.stdpath("data") .. "/git-panel"
local libName = string.format("libvscode_diff_%s.so", VERSION)
local libPath = libDir .. "/" .. libName

local function downloadLibrary()
  local arch = detectArch()
  local downloadFilename = string.format("libvscode_diff_linux_%s_%s.so", arch, VERSION)
  local url = string.format("https://github.com/esmuellert/vscode-diff.nvim/releases/download/v%s/%s", VERSION, downloadFilename)

  if vim.fn.isdirectory(libDir) == 0 then
    vim.fn.mkdir(libDir, "p")
  end

  vim.fn.system({ "curl", "-sSfL", "-o", libPath, url })
end

if vim.fn.filereadable(libPath) == 0 then
  downloadLibrary()
end

local lib = ffi.load(libPath)

ffi.cdef([[
  typedef struct { int start_line; int end_line; } LineRange;
  typedef struct { int start_line; int start_col; int end_line; int end_col; } CharRange;
  typedef struct { CharRange original; CharRange modified; } RangeMapping;
  typedef struct { LineRange original; LineRange modified; RangeMapping* inner_changes; int inner_change_count; } DetailedLineRangeMapping;
  typedef struct { DetailedLineRangeMapping* mappings; int count; int capacity; } DetailedLineRangeMappingArray;
  typedef struct { LineRange original; LineRange modified; } MovedText;
  typedef struct { MovedText* moves; int count; int capacity; } MovedTextArray;
  typedef struct { DetailedLineRangeMappingArray changes; MovedTextArray moves; bool hit_timeout; } LinesDiff;
  typedef struct { bool ignore_trim_whitespace; int max_computation_time_ms; bool compute_moves; bool extend_to_subwords; } DiffOptions;

  LinesDiff* compute_diff(const char** original_lines, int original_count, const char** modified_lines, int modified_count, const DiffOptions* options);
  void free_lines_diff(LinesDiff* diff);
  const char* get_version(void);
]])

local function luaToCStrings(lines)
  local count = #lines
  local cArray = ffi.new("const char*[?]", count)
  for i = 1, count do cArray[i - 1] = lines[i] end
  return cArray, count
end

local function charRangeToLua(cRange)
  return {
    start_line = cRange.start_line,
    start_col = cRange.start_col,
    end_line = cRange.end_line,
    end_col = cRange.end_col,
  }
end

local function lineRangeToLua(cRange)
  return { start_line = cRange.start_line, end_line = cRange.end_line }
end

local function rangeMappingToLua(cMapping)
  return { original = charRangeToLua(cMapping.original), modified = charRangeToLua(cMapping.modified) }
end

local function detailedMappingToLua(cMapping)
  local innerChanges = {}
  if cMapping.inner_changes ~= nil then
    for i = 0, cMapping.inner_change_count - 1 do
      table.insert(innerChanges, rangeMappingToLua(cMapping.inner_changes[i]))
    end
  end
  return {
    original = lineRangeToLua(cMapping.original),
    modified = lineRangeToLua(cMapping.modified),
    inner_changes = innerChanges,
  }
end

local function movedTextToLua(cMoved)
  return { original = lineRangeToLua(cMoved.original), modified = lineRangeToLua(cMoved.modified) }
end

local function linesDiffToLua(cDiff)
  if cDiff == nil then return end
  local changes = {}
  for i = 0, cDiff.changes.count - 1 do
    table.insert(changes, detailedMappingToLua(cDiff.changes.mappings[i]))
  end
  local moves = {}
  for i = 0, cDiff.moves.count - 1 do
    table.insert(moves, movedTextToLua(cDiff.moves.moves[i]))
  end
  return { changes = changes, moves = moves, hit_timeout = cDiff.hit_timeout }
end

function M.computeDiff(originalLines, modifiedLines, options)
  options = options or {}
  local cOrig, origCount = luaToCStrings(originalLines)
  local cMod, modCount = luaToCStrings(modifiedLines)
  local cOptions = ffi.new("DiffOptions")
  cOptions.ignore_trim_whitespace = options.ignore_trim_whitespace or false
  cOptions.max_computation_time_ms = options.max_computation_time_ms or 5000
  cOptions.compute_moves = options.compute_moves or false
  cOptions.extend_to_subwords = options.extend_to_subwords or false

  local cDiff = lib.compute_diff(cOrig, origCount, cMod, modCount, cOptions)
  local luaDiff = linesDiffToLua(cDiff)
  if cDiff ~= nil then lib.free_lines_diff(cDiff) end
  return luaDiff
end

function M.getVersion() return ffi.string(lib.get_version()) end

return M
