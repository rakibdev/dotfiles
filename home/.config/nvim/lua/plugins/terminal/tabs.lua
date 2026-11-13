local M = {}

-- e.g. "bun run dev" spawns a child of the login shell; showing that child's
-- name (like vscode does) beats showing "zsh" for every terminal.
-- reads ​/proc directly instead of spawning pgrep/ps.
local function foregroundPid(pid)
	if not pid then
		return nil
	end
	local ok, children = pcall(vim.fn.readfile, '/proc/' .. pid .. '/task/' .. pid .. '/children')
	if not ok or not children[1] or children[1] == '' then
		return nil
	end
	return children[1]:match '(%d+)%s*$'
end

local function processName(pid)
	local ok, comm = pcall(vim.fn.readfile, '/proc/' .. pid .. '/comm')
	return ok and comm[1] or nil
end

-- OSC 0/1/2 title (set by shell prompt/apps) > running foreground command > shell name
local function resolveTitle(terminal)
	if not terminal then
		return 'Terminal'
	end
	local title = vim.b[terminal.buffer].term_title
	-- unset term_title defaults to the term:// buffer name, not a real title
	if title and title ~= '' and not title:match '^term://' then
		return title
	end
	local childPid = foregroundPid(terminal.pid)
	local name = childPid and processName(childPid) or vim.fn.fnamemodify(vim.o.shell or 'bash', ':t')
	-- live-read cwd of the actual foreground process, not a cached spawn-time cwd
	local cwd = vim.uv.fs_readlink('/proc/' .. (childPid or terminal.pid) .. '/cwd')
	if cwd and vim.fn.fnamemodify(cwd, ':p') ~= vim.fn.fnamemodify(vim.fn.getcwd(), ':p') then
		return vim.fn.fnamemodify(cwd, ':t') .. ' ' .. name
	end
	return name
end

local function tabLabel(terminal)
	local title = resolveTitle(terminal)
	if vim.fn.strdisplaywidth(title) > 16 then
		title = vim.fn.strcharpart(title, 0, 15) .. '…'
	end
	-- a shell title containing % would be read as a winbar item
	return (title:gsub('%%', '%%%%'))
end

-- widest run of tabs that fits the window while keeping the active one visible
local function visibleRange(widths, activeIndex)
	-- ◀ ▶ are ambiguous-width, so reserve 2 cells each
	local budget = vim.o.columns - 4
	local first, last = activeIndex, activeIndex
	local total = widths[activeIndex]
	while true do
		local grew = false
		if first > 1 and total + widths[first - 1] <= budget then
			first = first - 1
			total = total + widths[first]
			grew = true
		end
		if last < #widths and total + widths[last + 1] <= budget then
			last = last + 1
			total = total + widths[last]
			grew = true
		end
		if not grew then
			return first, last
		end
	end
end

function M.update(window, terminals, activeIndex)
	if not (window and vim.api.nvim_win_is_valid(window)) then
		return
	end

	local labels, widths = {}, {}
	for index, terminal in ipairs(terminals) do
		labels[index] = tabLabel(terminal)
		widths[index] = vim.fn.strdisplaywidth(labels[index]) + 2
	end

	local first, last = visibleRange(widths, activeIndex)
	local parts = {}
	if first > 1 then
		table.insert(parts, '%#TabLine#◀')
	end
	for index = first, last do
		local group = index == activeIndex and '%#TabLineSel#' or '%#TabLine#'
		table.insert(parts, group .. '%' .. index .. '@v:lua.TerminalTab@ ' .. labels[index] .. ' %X')
	end
	if last < #widths then
		table.insert(parts, '%#TabLine#▶')
	end
	table.insert(parts, '%#TabLineFill#')
	vim.wo[window].winbar = table.concat(parts)

	local terminal = terminals[activeIndex]
	if terminal then
		-- winheight() excludes the winbar row, nvim_win_get_height() counts it
		vim.fn.jobresize(terminal.channel, vim.api.nvim_win_get_width(window), vim.fn.winheight(window))
	end
end

return M
