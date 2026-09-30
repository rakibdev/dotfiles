local headings = {}
for level = 1, 6 do
	headings['heading_' .. level] = { sign = false }
end

return {
	'OXY2DEV/markview.nvim',
	lazy = false, -- plugin lazy-loads itself
	init = function()
		-- wide tables shows unstyled if wrap is true
		vim.api.nvim_create_autocmd('FileType', {
			pattern = 'markdown',
			callback = function()
				vim.opt_local.wrap = false
			end,
		})
	end,
	opts = {
		preview = {
			icon_provider = 'devicons',
		},
		markdown = {
			headings = headings,
			code_blocks = { sign = false },
		},
	},
}
