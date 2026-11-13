local M = {}

local dataFile = vim.fn.stdpath('data') .. '/command-history.json'

function M.load()
  local ok, lines = pcall(vim.fn.readfile, dataFile)
  if not ok or not lines or not lines[1] then return { commands = {} } end
  return vim.json.decode(table.concat(lines, '')) or { commands = {} }
end

function M.save(data)
  pcall(vim.fn.writefile, { vim.json.encode(data) }, dataFile)
end

return M
