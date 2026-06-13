local function resolveFile(name)
  local exact = vim.fn.expand(name)
  if vim.fn.filereadable(exact) == 1 then return exact end

  -- Optimize: avoid recursive directory search for absolute/relative paths that don't exist
  if exact:match("^/") or exact:match("^%.%.?/") or exact:match("^%a:") or exact:match("^~") then
    return nil
  end

  local found = vim.fn.findfile(name, "**")
  if found ~= "" then return found end
  return nil
end

local function openFile(termWindow, onClose, path, startLine, endLine)
  if termWindow and vim.api.nvim_win_is_valid(termWindow) then
    vim.api.nvim_win_close(termWindow, false)
    onClose()
  end
  vim.cmd("edit " .. vim.fn.fnameescape(path))
  if startLine then
    local line_count = vim.api.nvim_buf_line_count(0)
    startLine = math.max(1, math.min(startLine, line_count))
    vim.api.nvim_win_set_cursor(0, { startLine, 0 })
    if endLine and endLine ~= startLine then
      endLine = math.max(1, math.min(endLine, line_count))
      vim.cmd("normal! V")
      vim.api.nvim_win_set_cursor(0, { endLine, 0 })
    end
  end
end

local function findMatch(line, col, pattern)
  local init = 1
  while true do
    local s, e, cap1, cap2, cap3 = line:find(pattern, init)
    if not s then break end
    if col >= s and col <= e then
      return cap1 or line:sub(s, e), cap2, cap3
    end
    init = e + 1
  end
  return nil
end

return function(termWindow, onClose)
  local mouse = vim.fn.getmousepos()
  if mouse.winid == 0 or mouse.line == 0 or mouse.column == 0 then
    return
  end

  local bufnr = vim.api.nvim_win_get_buf(mouse.winid)
  local line  = vim.api.nvim_buf_get_lines(bufnr, mouse.line - 1, mouse.line, false)[1] or ""
  local col   = mouse.column

  -- URL
  local url = findMatch(line, col, "https?://[%w%.%-%_%~%:%/%?%#%[%]%@%!%$%&%'%(%)%*%+%,%;%=]+")
  if url then
    vim.fn.jobstart({ "xdg-open", url }, { detach = true })
    return
  end

  -- path#Lstart-end or path#Lstart
  -- path:start-end or path:line
  local patterns = {
    "([^%s]+)#L(%d+)%-(%d+)",
    "([^%s]+)#L(%d+)",
    "([^%s:]+):(%d+)%-(%d+)",
    "([^%s:]+):(%d+)",
  }

  for _, pat in ipairs(patterns) do
    local path, startLine, endLine = findMatch(line, col, pat)
    if path then
      local resolved = resolveFile(path)
      if resolved then
        openFile(termWindow, onClose, resolved, tonumber(startLine), tonumber(endLine))
        return
      end
    end
  end

  -- bare path
  local cfile = vim.fn.expand("<cfile>")
  if cfile ~= "" then
    local resolved = resolveFile(cfile)
    if resolved then
      openFile(termWindow, onClose, resolved)
    end
  end
end
