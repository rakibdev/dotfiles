return {
	'stevearc/conform.nvim',
	event = 'BufWritePre',
	opts = {
		formatters_by_ft = {
			javascript = { 'oxfmt' },
			javascriptreact = { 'oxfmt' },
			typescript = { 'oxfmt' },
			typescriptreact = { 'oxfmt' },
			json = { 'oxfmt' },
			jsonc = { 'oxfmt' },
			c = { 'clang_format' },
			cpp = { 'clang_format' },
			lua = { 'stylua' },
		},
		-- fixes statusbar keeps showing file modified dot
		format_on_save = { undojoin = true },
	},
}
