local M = {}
local copyClean = require('selection').copyClean
local tabs = require 'plugins.terminal.tabs'

local terminals = {}
local activeIndex = nil
M.window = nil

local function getWindowOptions()
	return {
		relative = 'editor',
		width = vim.o.columns,
		height = vim.o.lines - vim.o.cmdheight,
		row = 0,
		col = 0,
		style = 'minimal',
	}
end

local function updateTabs()
	tabs.update(M.window, terminals, activeIndex)
end

function _G.TerminalTab(index, _, button)
	if button == 'r' then
		-- TermClose does the bookkeeping, same as the shell exiting on its own
		vim.fn.jobstop(terminals[index].channel)
	else
		M.jumpTo(index)
	end
end

vim.api.nvim_create_autocmd('VimResized', {
	callback = function()
		if M.window and vim.api.nvim_win_is_valid(M.window) then
			vim.api.nvim_win_set_config(M.window, getWindowOptions())
			updateTabs()
		end
	end,
})

-- live-refresh tab label when shell emits an OSC title sequence
vim.api.nvim_create_autocmd('TermRequest', {
	pattern = 'term://*',
	callback = function(event)
		if terminals[activeIndex] and terminals[activeIndex].buffer == event.buf then
			updateTabs()
		end
	end,
})

local function createTerminal(cwd)
	local buffer = vim.api.nvim_create_buf(false, true)

	local channel
	vim.api.nvim_buf_call(buffer, function()
		channel = vim.fn.termopen(vim.o.shell or 'bash', { cwd = cwd or vim.fn.getcwd() })
	end)

	local terminal = { buffer = buffer, channel = channel, pid = vim.fn.jobpid(channel) }
	table.insert(terminals, terminal)
	activeIndex = #terminals

	vim.bo[buffer].bufhidden = 'hide'
	vim.bo[buffer].buflisted = false

	-- Crucial Fix: Disable selectmode locally in this terminal buffer
	-- to prevent mouse clicks/drags from launching select mode.
	vim.opt_local.selectmode = ''
	vim.opt_local.signcolumn = 'no'

	vim.api.nvim_create_autocmd({ 'BufEnter', 'WinEnter' }, {
		buffer = buffer,
		callback = function()
			vim.cmd 'startinsert'
		end,
	})

	-- refresh title shortly after the pty actually produces output, not on a blind poll
	local debounceTimer = nil
	vim.api.nvim_buf_attach(buffer, false, {
		on_lines = function()
			if debounceTimer then
				debounceTimer:stop()
				debounceTimer:close()
			end
			debounceTimer = vim.uv.new_timer()
			debounceTimer:start(
				400,
				0,
				vim.schedule_wrap(function()
					debounceTimer = nil
					if terminals[activeIndex] and terminals[activeIndex].buffer == buffer then
						updateTabs()
					end
				end)
			)
		end,
	})

	local options = { buffer = buffer }
	vim.keymap.set('t', '<Esc>', function()
		vim.fn.chansend(channel, '\27')
	end, options)
 vim.keymap.set('v', '<LeftRelease>', copyClean, { buffer = buffer, silent = true })

	vim.api.nvim_create_autocmd('TermClose', {
		buffer = buffer,
		callback = function()
			local targetIndex = nil
			for index, term in ipairs(terminals) do
				if term.buffer == buffer then
					targetIndex = index
					break
				end
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
						updateTabs()
					end
				end
			end
		end,
	})

	return terminal
end

local hasSelection = false

function M.toggle()
	if M.window and vim.api.nvim_win_is_valid(M.window) then
		vim.api.nvim_win_close(M.window, true)
		M.window = nil
		-- restore selection
		if hasSelection then
			vim.cmd 'normal! gv'
		end
		return
	end

	hasSelection = vim.fn.mode():match '^[vV\22]' ~= nil

	local terminal = terminals[activeIndex]
	if not terminal or not vim.api.nvim_buf_is_valid(terminal.buffer) then
		terminals = {}
		activeIndex = nil
		terminal = createTerminal()
	end

	M.window = vim.api.nvim_open_win(terminal.buffer, true, getWindowOptions())
	vim.cmd 'startinsert'
	updateTabs()
end

function M.new(cwd)
	local terminal = createTerminal(cwd)
	if M.window and vim.api.nvim_win_is_valid(M.window) then
		vim.api.nvim_win_set_buf(M.window, terminal.buffer)
	else
		M.window = vim.api.nvim_open_win(terminal.buffer, true, getWindowOptions())
	end
	vim.cmd 'startinsert'
	updateTabs()
end

function M.cycle()
	if #terminals <= 1 then
		return
	end
	activeIndex = (activeIndex % #terminals) + 1
	local terminal = terminals[activeIndex]
	if M.window and vim.api.nvim_win_is_valid(M.window) then
		vim.api.nvim_win_set_buf(M.window, terminal.buffer)
		updateTabs()
		vim.cmd 'startinsert'
	end
end
function M.getActiveTerminal()
	return terminals[activeIndex]
end

function M.jumpTo(index)
	local terminal = terminals[index]
	if not terminal then
		return
	end
	activeIndex = index
	if M.window and vim.api.nvim_win_is_valid(M.window) then
		vim.api.nvim_win_set_buf(M.window, terminal.buffer)
		vim.api.nvim_set_current_win(M.window)
		updateTabs()
		vim.cmd 'startinsert'
	end
end

return M
