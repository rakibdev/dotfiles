local M = {}
local copyClean = require('selection').copyClean

local terminals = {}
local activeIndex = nil
M.window = nil

local function getWindowOptions()
  local title = " Terminal "
  if activeIndex then
    title = string.format(" %d/%d ", activeIndex, #terminals)
  end
  return {
    relative  = "editor",
    width     = vim.o.columns - 2,
    height    = vim.o.lines - 3,
    row       = 0,
    col       = 0,
    style     = "minimal",
    border    = "rounded",
    title     = title,
    title_pos = "right",
  }
end

local function updateTitle()
  if M.window and vim.api.nvim_win_is_valid(M.window) then
    local opts = getWindowOptions()
    vim.api.nvim_win_set_config(M.window, opts)
    local terminal = terminals[activeIndex]
    if terminal and terminal.channel then
      vim.fn.jobresize(terminal.channel, opts.width, opts.height)
    end
  end
end

local function createTerminal(cwd)
  local buffer = vim.api.nvim_create_buf(false, true)

  local channel
  vim.api.nvim_buf_call(buffer, function()
    channel = vim.fn.termopen(vim.o.shell or "bash", { cwd = cwd or vim.fn.getcwd() })
  end)

  local terminal = { buffer = buffer, channel = channel }
  table.insert(terminals, terminal)
  activeIndex = #terminals

  vim.bo[buffer].bufhidden = "hide"
  vim.bo[buffer].buflisted = false

  -- Crucial Fix: Disable selectmode locally in this terminal buffer
  -- to prevent mouse clicks/drags from launching select mode.
  vim.opt_local.selectmode = ""
  vim.opt_local.signcolumn = "no"

  vim.api.nvim_create_autocmd({ "BufEnter", "WinEnter" }, {
    buffer = buffer,
    callback = function() vim.cmd("startinsert") end,
  })

  local options = { buffer = buffer }
  vim.keymap.set("t", "<Esc>", function() vim.fn.chansend(channel, "\27") end, options)
  vim.keymap.set("v", "<LeftRelease>", copyClean, { buffer = buffer, silent = true })

  vim.api.nvim_create_autocmd("TermClose", {
    buffer = buffer,
    callback = function()
      local targetIndex = nil
      for index, term in ipairs(terminals) do
        if term.buffer == buffer then targetIndex = index break end
      end
      if targetIndex then
        table.remove(terminals, targetIndex)
        if #terminals == 0 then
          activeIndex = nil
          if M.window and vim.api.nvim_win_is_valid(M.window) then
            vim.api.nvim_win_close(M.window, true)
            M.window = nil
          end
        else
          activeIndex = math.max(1, math.min(activeIndex, #terminals))
          if M.window and vim.api.nvim_win_is_valid(M.window) then
            vim.api.nvim_win_set_buf(M.window, terminals[activeIndex].buffer)
            updateTitle()
          end
        end
      end
    end,
  })

  return terminal
end

function M.toggle()
  if M.window and vim.api.nvim_win_is_valid(M.window) then
    vim.api.nvim_win_close(M.window, true)
    M.window = nil
    return
  end

  local terminal = terminals[activeIndex]
  if not terminal or not vim.api.nvim_buf_is_valid(terminal.buffer) then
    terminals = {}
    activeIndex = nil
    terminal = createTerminal()
  end

  M.window = vim.api.nvim_open_win(terminal.buffer, true, getWindowOptions())
  vim.cmd("startinsert")
  updateTitle()
end

function M.new(cwd)
  local terminal = createTerminal(cwd)
  if M.window and vim.api.nvim_win_is_valid(M.window) then
    vim.api.nvim_win_set_buf(M.window, terminal.buffer)
  else
    M.window = vim.api.nvim_open_win(terminal.buffer, true, getWindowOptions())
  end
  vim.cmd("startinsert")
  updateTitle()
end

function M.cycle()
  if #terminals <= 1 then return end
  activeIndex = (activeIndex % #terminals) + 1
  local terminal = terminals[activeIndex]
  if M.window and vim.api.nvim_win_is_valid(M.window) then
    vim.api.nvim_win_set_buf(M.window, terminal.buffer)
    updateTitle()
    vim.cmd("startinsert")
  end
end
function M.getActiveTerminal()
  return terminals[activeIndex]
end

return M

