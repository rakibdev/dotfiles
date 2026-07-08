return {
	'stevearc/conform.nvim',
	event = 'BufWritePre',
	opts = {
		formatters_by_ft = {
			javascript = { 'oxlint', 'oxfmt' },
			javascriptreact = { 'oxlint', 'oxfmt' },
			typescript = { 'oxlint', 'oxfmt' },
			typescriptreact = { 'oxlint', 'oxfmt' },
			json = { 'oxfmt' },
			jsonc = { 'oxfmt' },
			c = { 'clang_format' },
			cpp = { 'clang_format' },
			lua = { 'stylua' },
			vue = { 'oxlint', 'oxfmt' },
		},
		-- fixes statusbar keeps showing file modified dot
		format_on_save = { undojoin = true },
	},
}
