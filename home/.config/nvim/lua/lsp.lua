vim.diagnostic.config {
	virtual_text = false,
	virtual_lines = false,
	update_in_insert = false,
	signs = {
		text = {
			[vim.diagnostic.severity.ERROR] = '',
			[vim.diagnostic.severity.WARN] = '',
			[vim.diagnostic.severity.INFO] = '',
			[vim.diagnostic.severity.HINT] = '',
		},
	},
	float = {
		focusable = true,
		border = 'rounded',
		source = true,
	},
}

vim.api.nvim_create_autocmd('LspAttach', {
	callback = function(ev)
		local buf = ev.buf
		vim.keymap.set('n', 'gd', vim.lsp.buf.definition, { buffer = buf, desc = 'Go to definition' })
		vim.keymap.set({ 'n', 'v' }, '<C-LeftMouse>', function()
			local mouse = vim.fn.getmousepos()
			if mouse.winid > 0 then
				vim.api.nvim_set_current_win(mouse.winid)
				vim.api.nvim_win_set_cursor(mouse.winid, { mouse.line, mouse.column - 1 })
			end
			local word = vim.fn.expand '<cword>'
			vim.lsp.buf.definition {
				on_list = function(options)
					if not options.items or #options.items == 0 then
						return
					end
					local item = options.items[1]
					vim.cmd('edit ' .. vim.fn.fnameescape(item.filename))
					vim.api.nvim_win_set_cursor(0, { item.lnum, item.col - 1 })
					vim.cmd 'normal! zz'
					vim.fn.setreg('/', '\\<' .. word .. '\\>')
					vim.opt.hlsearch = true
				end,
			}
		end, { buffer = buf, desc = 'Ctrl+click definition' })
		vim.keymap.set('n', 'K', vim.lsp.buf.hover, { buffer = buf, desc = 'Hover' })
		vim.keymap.set('n', 'gr', vim.lsp.buf.references, { buffer = buf, desc = 'References' })
		vim.keymap.set('n', '<F2>', vim.lsp.buf.rename, { buffer = buf, desc = 'Rename' })
		vim.keymap.set({ 'n', 'v' }, '<C-S-a>', vim.lsp.buf.code_action, { buffer = buf, desc = 'Code action' })
	end,
})

vim.lsp.handlers['textDocument/references'] = function(_, result, ctx)
	if not result or #result == 0 then
		vim.notify 'No references'
		return
	end
	local enc = vim.lsp.get_client_by_id(ctx.client_id).offset_encoding
	local items = vim.lsp.util.locations_to_items(result, enc)

	local lines = {}
	for _, item in ipairs(items) do
		table.insert(
			lines,
			string.format('%s:%d  %s', vim.fn.fnamemodify(item.filename, ':~:.'), item.lnum, vim.trim(item.text))
		)
	end

	local max_w = 0
	for _, l in ipairs(lines) do
		max_w = math.max(max_w, #l)
	end
	local width = math.min(math.max(max_w, 30), math.floor(vim.o.columns * 0.7))
	local height = math.min(#items, 15)

	local buf = vim.api.nvim_create_buf(false, true)
	vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
	vim.bo[buf].modifiable = false

	local winnr = vim.api.nvim_open_win(buf, true, {
		relative = 'editor',
		row = math.floor((vim.o.lines - height) / 2),
		col = math.floor((vim.o.columns - width) / 2),
		width = width,
		height = height,
		style = 'minimal',
		border = 'rounded',
		title = ' References (' .. #items .. ') ',
		title_pos = 'center',
		focusable = true,
	})

	local close = function()
		pcall(vim.api.nvim_win_close, winnr, true)
	end
	local jump = function()
		local item = items[vim.api.nvim_win_get_cursor(0)[1]]
		close()
		vim.cmd('edit ' .. vim.fn.fnameescape(item.filename))
		vim.api.nvim_win_set_cursor(0, { item.lnum, item.col - 1 })
	end
	vim.keymap.set('n', '<CR>', jump, { buffer = buf, nowait = true })
	vim.keymap.set('n', '<LeftRelease>', jump, { buffer = buf, nowait = true })
	vim.keymap.set('n', '<Esc>', close, { buffer = buf, nowait = true })
	vim.keymap.set('n', 'q', close, { buffer = buf, nowait = true })
end

vim.lsp.config('tsgo', {
	cmd = { 'tsgo', '--lsp', '--stdio' },
	filetypes = { 'typescript', 'typescriptreact', 'javascript', 'javascriptreact' },
	root_dir = function(bufnr, on_dir)
		local root = vim.fs.root(
			bufnr,
			{ 'bun.lock', 'bun.lockb', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'package.json', '.git' }
		)
		on_dir(root or vim.fn.getcwd())
	end,
	settings = {
		typescript = {
			inlayHints = {
				parameterNames = { enabled = 'literals', suppressWhenArgumentMatchesName = true },
				parameterTypes = { enabled = true },
				variableTypes = { enabled = true },
				propertyDeclarationTypes = { enabled = true },
				functionLikeReturnTypes = { enabled = true },
				enumMemberValues = { enabled = true },
			},
		},
	},
})
vim.lsp.enable 'tsgo'

vim.lsp.config('jsonls', {
	cmd = { 'vscode-json-language-server', '--stdio' },
	filetypes = { 'json', 'jsonc' },
	root_markers = { '.git', 'package.json' },
})
vim.lsp.enable 'jsonls'

vim.lsp.config('clangd', {
	cmd = { '/usr/bin/clangd', '--header-insertion=iwyu' },
	filetypes = { 'c', 'cpp' },
	root_markers = { '.clang-format', 'compile_commands.json', '.git' },
})
vim.lsp.enable 'clangd'

vim.lsp.config('oxlint', {
	cmd = { 'oxlint', '--lsp' },
	filetypes = { 'javascript', 'javascriptreact', 'typescript', 'typescriptreact' },
	root_markers = { '.oxlintrc.json', 'package.json', '.git' },
})
vim.lsp.enable 'oxlint'

vim.lsp.config('tailwindcss', {
	cmd = { 'tailwindcss-language-server', '--stdio' },
	filetypes = { 'html', 'css', 'javascript', 'javascriptreact', 'typescript', 'typescriptreact' },
	root_markers = { 'tailwind.config.js', 'tailwind.config.ts' },
})
vim.lsp.enable 'tailwindcss'
