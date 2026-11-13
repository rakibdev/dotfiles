local function startupSection()
	local stats = require('lazy.stats').stats()
	local ms = math.floor(stats.startuptime * 100 + 0.5) / 100
	return {
		padding = 1,
		align = 'center',
		text = {
			{ stats.loaded .. '/' .. stats.count, hl = 'Special' },
			{ ' plugins · ', hl = 'Comment' },
			{ ms .. 'ms', hl = 'Special' },
		},
	}
end

return {
	'folke/snacks.nvim',
	opts = {
		dashboard = {
			sections = {
				{ padding = 2 },
				startupSection,
			},
		},
	},
	init = function()
		-- LazyVimStarted, not VimEnter: lazy fills in startuptime on UIEnter, which the
		-- builtin terminal UI fires after VimEnter, so it would still read 0ms there
		vim.api.nvim_create_autocmd('User', {
			pattern = 'LazyVimStarted',
			group = vim.api.nvim_create_augroup('Welcome', { clear = true }),
			once = true,
			callback = function()
				if not vim.env.NVIM_ROOT then
					Snacks.explorer.open { focus = false }
					return
				end
				Snacks.dashboard.open {
					buf = vim.api.nvim_get_current_buf(),
					win = vim.api.nvim_get_current_win(),
				}
			end,
		})
	end,
}
