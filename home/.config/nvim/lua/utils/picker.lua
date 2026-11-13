local M = {}

M.title = ''
M.prompt = ' '
M.excluded = { '.git', 'node_modules', 'build', 'dist', '*.lock' }

M.layout = {
	hidden = { 'preview' },
	layout = {
		box = 'vertical',
		border = true,
		backdrop = false,
		width = 0.4,
		min_width = 0,
		height = 0.4,
		{ win = 'input', height = 1, border = 'bottom' },
		{ win = 'list', border = 'none' },
	},
}

M.win = {
	input = { keys = { ['<Esc>'] = { 'cancel', mode = { 'n', 'i' } } } },
}

-- the window a normal file lives in: current one if it qualifies, else the
-- first that does. real file buffer, not a float, not locked (explorer, commit
-- box, diff panes) and not a picker/terminal/dashboard.
function M.editorWin()
	local function isEditor(win)
		return vim.api.nvim_win_get_config(win).relative == ''
			and not vim.wo[win].winfixbuf
			and vim.bo[vim.api.nvim_win_get_buf(win)].buftype == ''
	end
	local cur = vim.api.nvim_get_current_win()
	if isEditor(cur) then
		return cur
	end
	for _, win in ipairs(vim.api.nvim_tabpage_list_wins(0)) do
		if isEditor(win) then
			return win
		end
	end
end

-- edit a file in a normal editor window, never a winfixbuf one
-- (commit box, terminals, locked panels). pos: optional { line, col }.
function M.openFile(file, pos)
	-- git-mode never shows a file: leave it so the file opens as a normal single view
	local gitPanel = package.loaded['git-panel']
	if gitPanel and gitPanel.isActive() then
		gitPanel.close({ carry = false })
	end

	-- a window we can edit a file into: not locked (commit box, panels) and
	-- not a picker/special window.
	local function editable(win)
		if not vim.api.nvim_win_is_valid(win) or vim.wo[win].winfixbuf then
			return false
		end
		-- snacks_picker_list: explorer sidebar
		return vim.bo[vim.api.nvim_win_get_buf(win)].filetype ~= 'snacks_picker_list'
	end

	local cur = vim.api.nvim_get_current_win()
	if not editable(cur) then
		local target
		-- tabpage-scoped: nvim_list_wins() is global and could target another tab
		for _, win in ipairs(vim.api.nvim_tabpage_list_wins(0)) do
			if editable(win) then
				target = win
				break
			end
		end
		if target then
			vim.api.nvim_set_current_win(target)
		else
			vim.cmd 'botright vsplit'
		end
	end
	vim.cmd('edit ' .. vim.fn.fnameescape(file))
	if pos then
		vim.api.nvim_win_set_cursor(0, pos)
	end
end

return M
