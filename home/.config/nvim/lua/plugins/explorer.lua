local SIDEBAR_WIDTH = require('utils.sidebar').width
local pickerUtil    = require('utils.picker')

return {
	'folke/snacks.nvim',
	keys = {
		{
			'<C-b>',
			function()
				local gp = require 'git-panel'
				if gp.isActive() and gp._state then
					require('git-panel.explorer').toggleWin(gp._state)
				else
					Snacks.explorer.open()
				end
			end,
			desc = 'File explorer',
		},
	},
	opts = {
		explorer = {},
		picker = {
			actions = {
				open_terminal = function(picker, item)
					if not item then
						return
					end
					local cwd = item.dir and item.file or vim.fn.fnamemodify(item.file, ':h')
					require('plugins.terminal.api').new(cwd)
				end,
			},
			sources = {
				explorer = {
					on_change = function(_, item)
						if item and not item.dir then
							require('utils.git').activeFile = item.file
						end
					end,
					layout = { preset = 'sidebar', preview = false, hidden = { 'input' }, width = SIDEBAR_WIDTH },
					formatters = {
						file = { filename_only = true },
					},
					hidden = true,
					ignored = true,
					git_status = false,
					exclude = pickerUtil.excluded,
					diagnostics = false,
					win = {
						list = {
							wo = { winfixwidth = true },
							keys = {
								['<LeftRelease>'] = 'confirm',
								['<Esc>'] = false,
								['<C-p>'] = false, -- unblock global find files keymap
								['<C-g>'] = false, -- unblock git panel keymap
								['<C-b>'] = 'close',
								['<C-c>'] = { 'explorer_yank', mode = { 'n', 'v' } },
								['t'] = 'open_terminal',
								['n'] = 'explorer_add',
								['<Delete>'] = 'explorer_del',
							},
						},
					},
				},
			},
		},
	},
	config = function(_, opts)
		require('snacks').setup(opts)
		require('utils.sidebar').setup()
	end,
}
