return {
	'MeanderingProgrammer/render-markdown.nvim',
	ft = { 'markdown' },
	opts = {
		-- fixes double click toggling raw text
		render_modes = { 'n', 's', 'S', '\19' },
		latex = { enabled = false },
		sign = { enabled = false },
		anti_conceal = { enabled = false },
		heading = {
			sign = false,
			backgrounds = {},
			-- inline removes left gap in heading
			position = 'inline',
		},
		code = { sign = false },
		link = {
			image = false,
			image_custom = false,
		},
	},
}
