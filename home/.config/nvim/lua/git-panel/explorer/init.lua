local M = {}
local git = require 'git-panel.utils'
local render = require 'git-panel.explorer.render'

local function parseNumstatTotals(output)
	local added, deleted = 0, 0
	for line in output:gmatch '[^\n]+' do
		local a, d = line:match '^(%d+)%s+(%d+)'
		if a then
			added = added + tonumber(a)
			deleted = deleted + tonumber(d)
		end
	end
	return added, deleted
end

local function fetchRepoStats(state)
	local repos = require('utils.git').repoList()
	state.repoStats = state.repoStats or {}

	local function sumStatus(status)
		local added, deleted = 0, 0
		for _, e in ipairs(status.files) do
			added = added + (e.added or 0)
			deleted = deleted + (e.deleted or 0)
		end
		return added, deleted
	end

	local a, d = sumStatus(state.status)
	state.repoStats[state.gitRoot] = { added = a, deleted = d }

	for _, root in ipairs(repos) do
		if root ~= state.gitRoot then
			state.repoStats[root] = { added = 0, deleted = 0 }
			local function onDiff(result)
				if result.code == 0 then
					local ra, rd = parseNumstatTotals(result.stdout or '')
					state.repoStats[root].added = state.repoStats[root].added + ra
					state.repoStats[root].deleted = state.repoStats[root].deleted + rd
				end
				vim.schedule(function()
					if state.explorerBuf and vim.api.nvim_buf_is_valid(state.explorerBuf) then
						render.render(state)
					end
				end)
			end
			vim.system({ 'git', 'diff', '--numstat' }, { cwd = root, text = true }, onDiff)
			vim.system({ 'git', 'diff', '--cached', '--numstat' }, { cwd = root, text = true }, onDiff)
		end
	end
end

function M.selectFile(state, absPath, group)
	local entry
	for _, e in ipairs(state.status.files) do
		if state.gitRoot .. '/' .. e.path == absPath then
			if not group or e.group == group then
				entry = e
				break
			end
		end
	end
	if not entry then
		return
	end
	state.selected = { entry = entry, group = group or entry.group }
	require('utils.git').activeFile = absPath
	render.render(state)
	require('git-panel.diff').open(state)
end

function M.switchRepo(state, root)
	state.gitRoot = root
	require('utils.git').activeRoot = root
	vim.cmd 'redrawstatus'
	state.selected = nil
	require('git-panel.diff').clear(state)
	require('git-panel.explorer.watcher').start(state)
end

M.refresh = git.async(function(state)
	local err, status = git.getStatus(state.gitRoot)
	if err then
		vim.notify(err, vim.log.levels.ERROR)
		return
	end

	render.sortEntries(status.files)
	state.status = status

	if state.selected then
		local path = state.selected.entry.path
		local foundEntry

		for _, e in ipairs(status.files) do
			if e.path == path then
				foundEntry = e
				break
			end
		end

		if foundEntry then
			state.selected.entry = foundEntry
			require('git-panel.diff').reload(state)
		else
			state.selected = nil
			require('git-panel.diff').clear(state)
		end
	end

	fetchRepoStats(state)
	render.render(state)

	if state.preselect then
		local filepath = state.preselect
		state.preselect = nil
		M.selectFile(state, filepath)
	end
end)

local function setupWin(state, win)
	vim.api.nvim_win_set_buf(win, state.explorerBuf)
	vim.api.nvim_win_set_width(win, require('plugins.explorer').sidebarWidth)
	vim.wo[win].winfixwidth = true
	vim.wo[win].winfixbuf = true -- disables opening files in this window; when explorer is focused and fff opens a file, nvim would open it here instead of diff area
	vim.wo[win].signcolumn = 'no'
	vim.wo[win].cursorline = true
	vim.wo[win].fillchars = 'eob: ,vert: ,horiz:─,vertleft: '
end

function M.closeWin(state)
	if state.commitWin and vim.api.nvim_win_is_valid(state.commitWin) then
		vim.api.nvim_win_close(state.commitWin, false)
		state.commitWin = nil
	end
	if state.explorerWin and vim.api.nvim_win_is_valid(state.explorerWin) then
		vim.api.nvim_win_close(state.explorerWin, false)
		state.explorerWin = nil
	end
end

local function openWin(state)
	local leftmostWin = (state.diffOrigWin and vim.api.nvim_win_is_valid(state.diffOrigWin))
		and state.diffOrigWin or state.diffAreaWin
	vim.api.nvim_set_current_win(leftmostWin)
	vim.cmd('leftabove vsplit')
	state.explorerWin = vim.api.nvim_get_current_win()
	setupWin(state, state.explorerWin)
	render.render(state)
	vim.api.nvim_set_current_win(state.explorerWin)
	vim.cmd('belowright 2split')
	state.commitWin = vim.api.nvim_get_current_win()
	require('git-panel.explorer.commit').setupWin(state, state.commitWin)
	vim.api.nvim_set_current_win(state.diffAreaWin)
end

function M.toggleWin(state)
	if state.explorerWin and vim.api.nvim_win_is_valid(state.explorerWin) then
		M.closeWin(state)
	else
		openWin(state)
	end
end

function M.init(state)
	-- re-entering git-mode: buffer/keymaps/commit already set up, just reattach window
	if state.explorerBuf and vim.api.nvim_buf_is_valid(state.explorerBuf) then
		setupWin(state, state.explorerWin)
		render.render(state)
		vim.api.nvim_set_current_win(state.explorerWin)
		vim.cmd('belowright 2split')
		state.commitWin = vim.api.nvim_get_current_win()
		require('git-panel.explorer.commit').setupWin(state, state.commitWin)
		vim.api.nvim_set_current_win(state.diffAreaWin)
		require('git-panel.explorer.watcher').start(state)
		M.refresh(state)
		return
	end

	local buf = vim.api.nvim_create_buf(false, true)
	vim.bo[buf].buftype = 'nofile'
	vim.bo[buf].bufhidden = 'hide'
	vim.bo[buf].modifiable = false
	vim.bo[buf].swapfile = false
	pcall(vim.api.nvim_buf_set_name, buf, 'Source Control')
	state.explorerBuf = buf

	-- Hide borders and intersection handles to blend window seamlessly
	setupWin(state, state.explorerWin)

	local function openAtCursor()
		local lnum = vim.api.nvim_win_get_cursor(state.explorerWin)[1]
		local info = state.lineMap[lnum]
		if not info then
			return
		end
		if info.type == 'repo' then
			if not info.isActive then
				M.switchRepo(state, info.root)
				M.refresh(state)
			end
			return
		end
		if info.type == 'dir' then return end
		local absPath = state.gitRoot .. '/' .. info.entry.path
		local stat = vim.uv.fs_stat(absPath)
		if stat and stat.type == 'directory' then
			return
		end
		M.selectFile(state, absPath, info.group)
	end

	local function getSelectedEntries()
		local mode = vim.fn.mode()
		local startLine, endLine
		if mode == 'v' or mode == 'V' or mode == '\22' then
			startLine = vim.fn.line 'v'
			endLine = vim.fn.line '.'
			if startLine > endLine then
				startLine, endLine = endLine, startLine
			end
			vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes('<Esc>', true, false, true), 'x', false)
		else
			startLine = vim.api.nvim_win_get_cursor(state.explorerWin)[1]
			endLine = startLine
		end

		local entries = {}
		for lnum = startLine, endLine do
			local info = state.lineMap[lnum]
			if info and info.type ~= 'repo' and info.type ~= 'dir' then
				table.insert(entries, info)
			end
		end
		return entries
	end

	local function stageFiles(action)
		local selected = getSelectedEntries()
		local paths = {}
		for _, info in ipairs(selected) do
			if action == 'stage' and info.group == 'unstaged' then
				table.insert(paths, info.entry.path)
			elseif action == 'unstage' and info.group == 'staged' then
				table.insert(paths, info.entry.path)
			end
		end

		if #paths == 0 then
			return
		end

		local gitArgs
		if action == 'stage' then
			gitArgs = vim.list_extend({ 'add', '--' }, paths)
		else
			gitArgs = vim.list_extend({ 'reset', 'HEAD', '--' }, paths)
		end

		vim.system(vim.list_extend({ 'git' }, gitArgs), {
			cwd = state.gitRoot,
			text = true,
		}, function(result)
			vim.schedule(function()
				if result.code == 0 then
					M.refresh(state)
				else
					local errMsg = (result.stderr and result.stderr ~= '') and result.stderr:gsub('%s+$', '') or 'Error'
					vim.notify(errMsg, vim.log.levels.ERROR)
				end
			end)
		end)
	end

	local function discardFiles()
		local selected = getSelectedEntries()
		local targets = {}
		for _, info in ipairs(selected) do
			table.insert(targets, info.entry)
		end

		if #targets == 0 then
			return
		end

		local choice = vim.fn.confirm(string.format('Discard %d files?', #targets), '&Yes\n&No', 2)
		if choice ~= 1 then
			return
		end

		local count = 0
		local function nextDiscard()
			if count == #targets then
				vim.schedule(function()
					M.refresh(state)
				end)
				return
			end
			count = count + 1
			local entry = targets[count]
			local cmd
			if entry.status == '??' then
				cmd = { 'git', 'clean', '-f', '--', entry.path }
			elseif entry.status == 'A' then
				cmd = { 'git', 'rm', '-f', '--', entry.path }
			elseif entry.group == 'unstaged' then
				cmd = { 'git', 'checkout', '--', entry.path }
			else
				cmd = { 'git', 'checkout', 'HEAD', '--', entry.path }
			end

			vim.system(cmd, { cwd = state.gitRoot }, function()
				nextDiscard()
			end)
		end
		nextDiscard()
	end

	local function navigate(direction)
		local totalLines = vim.api.nvim_buf_line_count(buf)
		local lnum = vim.api.nvim_win_get_cursor(state.explorerWin)[1]
		local info
		repeat
			lnum = lnum + direction
			info = state.lineMap[lnum]
		until lnum < 1 or lnum > totalLines or (info and info.type ~= 'dir')
		lnum = math.max(1, math.min(totalLines, lnum))
		vim.api.nvim_win_set_cursor(state.explorerWin, { lnum, 0 })
	end

	local o = { buffer = buf, nowait = true, silent = true }
	vim.keymap.set('n', '<CR>', openAtCursor, o)
	vim.keymap.set('n', '<LeftRelease>', openAtCursor, o)
	vim.keymap.set('n', '<Up>',   function() navigate(-1) end, o)
	vim.keymap.set('n', '<Down>', function() navigate(1) end, o)
	vim.keymap.set({ 'n', 'v' }, '=', function()
		stageFiles 'stage'
	end, o)
	vim.keymap.set({ 'n', 'v' }, '-', function()
		stageFiles 'unstage'
	end, o)
	vim.keymap.set({ 'n', 'v' }, '_', discardFiles, o)

	require('git-panel.explorer.watcher').start(state)
	M.refresh(state)
	require('git-panel.explorer.commit').init(state)

	local refreshGroup = vim.api.nvim_create_augroup('GitPanelRefresh', { clear = true })
	vim.api.nvim_create_autocmd({ 'FocusGained', 'BufWritePost', 'FileChangedShellPost', 'BufEnter' }, {
		group = refreshGroup,
		callback = function()
			if require('git-panel').active and state.explorerBuf and vim.api.nvim_buf_is_valid(state.explorerBuf) then
				if vim.o.autoread then
					vim.cmd('checktime')
				end
				M.refresh(state)
			end
		end,
	})

	vim.api.nvim_create_autocmd('WinResized', {
		group = vim.api.nvim_create_augroup('GitPanelExplorerResize', { clear = true }),
		callback = function()
			if require('git-panel').active and state.explorerBuf and vim.api.nvim_buf_is_valid(state.explorerBuf) then
				render.render(state)
			end
		end,
	})
end

return M
