local api = require("plugins.terminal.api")

return function()
  local path = vim.fn.expand("%:.")
  if path == "" then return end

  local lineRange = ""
  local mode = vim.fn.mode()
  if mode == "v" or mode == "V" then
    local startLine = vim.fn.getpos("v")[2]
    local endLine   = vim.fn.getpos(".")[2]
    if startLine > endLine then startLine, endLine = endLine, startLine end
    lineRange = startLine == endLine
      and string.format("#L%d", startLine)
      or  string.format("#L%d-%d", startLine, endLine)
  end

  local text = string.format("@%s%s", path, lineRange)

  if not api.window or not vim.api.nvim_win_is_valid(api.window) then
    api.toggle()
  end

  vim.schedule(function()
    local terminal = api.getActiveTerminal()
    if terminal and terminal.channel then
      vim.fn.chansend(terminal.channel, text .. " ")
      vim.cmd("startinsert")
    end
  end)
end
