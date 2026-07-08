local M = {}

function M.gotoHunk(state, direction)
	local changes = state.diffChanges
	if not changes or #changes == 0 then
		return
	end

	local curWin = vim.api.nvim_get_current_win()
	local isOrig = (curWin == state.diffOrigWin)
	local curLine = vim.api.nvim_win_get_cursor(curWin)[1]

	local foundChange
	for _, change in ipairs(changes) do
		local start = isOrig and change.original.start_line or change.modified.start_line
		if direction == 'next' then
			if start > curLine then
				foundChange = change
				break
			end
		else
			if start < curLine then
				foundChange = change
			end
		end
	end
	if not foundChange then
		foundChange = direction == 'next' and changes[1] or changes[#changes]
	end

	if foundChange then
		if state.diffOrigWin and vim.api.nvim_win_is_valid(state.diffOrigWin) then
			pcall(vim.api.nvim_win_set_cursor, state.diffOrigWin, { math.max(1, foundChange.original.start_line), 0 })
			vim.api.nvim_win_call(state.diffOrigWin, function() vim.cmd 'normal! zz' end)
		end
		if state.diffModWin and vim.api.nvim_win_is_valid(state.diffModWin) then
			pcall(vim.api.nvim_win_set_cursor, state.diffModWin, { math.max(1, foundChange.modified.start_line), 0 })
			vim.api.nvim_win_call(state.diffModWin, function() vim.cmd 'normal! zz' end)
		end
	end
end

function M.makePatch(state)
	local sel = state.selected
	if not sel then
		return
	end
	local path = sel.entry.path

	local changes = state.diffChanges
	if not changes or #changes == 0 then
		return
	end

	local curWin = vim.api.nvim_get_current_win()
	local isOrig = (curWin == state.diffOrigWin)
	local startSel = math.min(vim.fn.line '.', vim.fn.line 'v')
	local endSel = math.max(vim.fn.line '.', vim.fn.line 'v')

	local intersecting = {}
	for _, change in ipairs(changes) do
		local r = isOrig and change.original or change.modified
		if not (math.max(r.start_line, r.end_line - 1) < startSel or r.start_line > endSel) then
			table.insert(intersecting, change)
		end
	end
	if #intersecting == 0 then
		return
	end

	local origLines = vim.api.nvim_buf_get_lines(state.diffOrigBuf, 0, -1, false)
	local modLines = vim.api.nvim_buf_get_lines(state.diffModBuf, 0, -1, false)

	local patch = {}
	table.insert(patch, string.format('diff --git a/%s b/%s', path, path))
	table.insert(patch, string.format('--- a/%s', path))
	table.insert(patch, string.format('+++ b/%s', path))

	local first = intersecting[1]
	local last = intersecting[#intersecting]
	local o = { start_line = first.original.start_line, end_line = last.original.end_line }
	local m = { start_line = first.modified.start_line, end_line = last.modified.end_line }

	local ctxB = math.min(3, o.start_line - 1, m.start_line - 1)
	local ctxA = math.min(3, #origLines - o.end_line + 1, #modLines - m.end_line + 1)
	local oCount = o.end_line - o.start_line
	local mCount = m.end_line - m.start_line

	table.insert(
		patch,
		string.format(
			'@@ -%d,%d +%d,%d @@',
			o.start_line - ctxB,
			ctxB + oCount + ctxA,
			m.start_line - ctxB,
			ctxB + mCount + ctxA
		)
	)

	for l = o.start_line - ctxB, o.start_line - 1 do
		table.insert(patch, ' ' .. origLines[l])
	end
	for l = o.start_line, o.end_line - 1 do
		table.insert(patch, '-' .. origLines[l])
	end
	for l = m.start_line, m.end_line - 1 do
		table.insert(patch, '+' .. modLines[l])
	end
	for l = o.end_line, o.end_line - 1 + ctxA do
		table.insert(patch, ' ' .. origLines[l])
	end

	return table.concat(patch, '\n') .. '\n'
end

function M.stageUnstage(state, action)
	local patchText = M.makePatch(state)
	if not patchText then
		return
	end

	local gitArgs = { 'apply', '--cached', '--unidiff-zero', '-' }
	if action == 'unstage' then
		table.insert(gitArgs, 3, '--reverse')
	end

	vim.system(vim.list_extend({ 'git' }, gitArgs), {
		cwd = state.gitRoot,
		text = true,
		stdin = patchText,
	}, function(result)
		vim.schedule(function()
			if result.code == 0 then
				require('git-panel.utils').clearCache()
				require('git-panel.explorer').refresh(state)
			else
				local errMsg = (result.stderr and result.stderr ~= '') and result.stderr:gsub('%s+$', '') or 'Error'
				vim.notify(errMsg, vim.log.levels.ERROR)
			end
		end)
	end)
end

function M.discard(state)
	local sel = state.selected
	if not sel or sel.group == 'staged' then
		return
	end

	local patchText = M.makePatch(state)
	if not patchText then
		vim.notify('No changes under cursor to discard', vim.log.levels.WARN)
		return
	end

	local lineCount = 0
	for _ in patchText:gmatch('%-[^\n]') do lineCount = lineCount + 1 end

	local choice = vim.fn.confirm(string.format('Discard %d lines?', lineCount), '&Yes\n&No', 2)
	if choice ~= 1 then
		return
	end

	vim.system({ 'git', 'apply', '--reverse', '--unidiff-zero', '-' }, {
		cwd = state.gitRoot,
		text = true,
		stdin = patchText,
	}, function(result)
		vim.schedule(function()
			if result.code == 0 then
				require('git-panel.utils').clearCache()
				require('git-panel.explorer').refresh(state)
			else
				local errMsg = (result.stderr and result.stderr ~= '') and result.stderr:gsub('%s+$', '') or 'Error'
				vim.notify(errMsg, vim.log.levels.ERROR)
			end
		end)
	end)
end

return M
