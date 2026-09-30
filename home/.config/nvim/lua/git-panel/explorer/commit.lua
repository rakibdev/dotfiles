local M = {}
local git = require 'git-panel.utils'
local ns = vim.api.nvim_create_namespace 'git_panel_commit'

local spinnerFrames = { '⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏' }

function M.push(state, onDone)
	local buf = state.commitBuf
	local active = true
	local frame = 1
	local label = 'Pushing…'
	local function tick()
		if not active or not vim.api.nvim_buf_is_valid(buf) then
			return
		end
		vim.api.nvim_buf_clear_namespace(buf, ns, 0, -1)
		vim.api.nvim_buf_set_extmark(buf, ns, 0, 0, {
			virt_text = { { spinnerFrames[frame] .. ' ' .. label, 'DiagnosticInfo' } },
			virt_text_pos = 'overlay',
		})
		frame = (frame % #spinnerFrames) + 1
		vim.defer_fn(tick, 80)
	end
	tick()

	local function finish(err)
		active = false
		if vim.api.nvim_buf_is_valid(buf) then
			vim.api.nvim_buf_clear_namespace(buf, ns, 0, -1)
		end
		if err then
			vim.notify(err, vim.log.levels.ERROR)
		else
			require('git-panel.explorer').refresh(state)
		end
		if onDone then onDone(err) end
	end

	local gitRoot = state.gitRoot
	local pushErr
	if git.hasUpstream(gitRoot) then
		pushErr = git.push(gitRoot)
	else
		local branchErr, branch = git.currentBranch(gitRoot)
		if branchErr then
			finish(branchErr)
			return
		end
		pushErr = git.push(gitRoot, branch)
	end

	if pushErr and pushErr:find '%[rejected%]' then
		label = 'Pulling…'
		local pullErr = git.pull(gitRoot)
		if pullErr then
			finish(pullErr)
			return
		end
		label = 'Pushing…'
		pushErr = git.push(gitRoot)
	end

	finish(pushErr)
end
M.push = git.async(M.push)

function M.setupWin(state, win)
	vim.api.nvim_win_set_buf(win, state.commitBuf)
	vim.wo[win].wrap = true

	-- Hides thick grey line beside placeholder
	vim.wo[win].colorcolumn = ''
	vim.wo[win].cursorline = false

	vim.wo[win].signcolumn = 'no'
	vim.wo[win].winfixheight = true
	vim.wo[win].winfixbuf = true -- prevent files opening into the commit box
	-- Hide borders and intersection handles to blend window seamlessly
	vim.wo[win].fillchars = 'eob: ,vert: ,horiz:─,vertleft: '
	vim.wo[win].statuscolumn = ' '
	vim.api.nvim_win_set_height(win, 3)
end

function M.init(state)
	vim.api.nvim_set_current_win(state.explorerWin)
	vim.cmd 'belowright 2split'
	local win = vim.api.nvim_get_current_win()
	local buf = vim.api.nvim_create_buf(false, true)
	state.commitWin = win
	state.commitBuf = buf

	vim.bo[buf].buftype = 'nofile'
	vim.bo[buf].bufhidden = 'hide'
	vim.bo[buf].filetype = 'gitcommit' -- used by blink.cmp for dictionary completion
	vim.bo[buf].textwidth = 0
	M.setupWin(state, win)

	local function showPlaceholder()
		local lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
		local empty = true
		for _, l in ipairs(lines) do
			if l:find '%S' then
				empty = false
				break
			end
		end
		vim.api.nvim_buf_clear_namespace(buf, ns, 0, -1)
		if empty then
			vim.api.nvim_buf_set_extmark(buf, ns, 0, 0, {
				virt_text = { { 'Message', 'GitPanelPlaceholder' } },
				virt_text_pos = 'overlay',
			})
		end
	end

	showPlaceholder()

	vim.api.nvim_create_autocmd({ 'TextChanged', 'TextChangedI' }, {
		buffer = buf,
		callback = showPlaceholder,
	})

	vim.api.nvim_create_autocmd('WinLeave', {
		buffer = buf,
		command = 'stopinsert',
	})

	local commitAndPush = git.async(function()
		local lines = vim.api.nvim_buf_get_lines(buf, 0, -1, false)
		local msg = vim.trim(table.concat(lines, '\n'))
		if msg == '' then
			vim.notify('Commit message required', vim.log.levels.WARN)
			return
		end

 	vim.cmd 'stopinsert'
 	vim.api.nvim_buf_set_lines(buf, 0, -1, false, { '' })
 	vim.bo[buf].modifiable = false

 	local err = git.commit(state.gitRoot, msg)
 	if err then
 		vim.bo[buf].modifiable = true
 		vim.notify(err, vim.log.levels.ERROR)
 		showPlaceholder()
 		return
 	end

 	M.push(state, function()
 		if vim.api.nvim_buf_is_valid(buf) then
 			vim.bo[buf].modifiable = true
 			showPlaceholder()
 		end
 	end)
 end)

	local o = { buffer = buf, nowait = true, silent = true }
	vim.keymap.set({ 'n', 'i' }, '<C-CR>', commitAndPush, o)
	vim.keymap.set('n', '<CR>', '<cmd>startinsert<CR>', o)
	vim.keymap.set('n', '<LeftRelease>', '<cmd>startinsert<CR>', o)
end

return M
