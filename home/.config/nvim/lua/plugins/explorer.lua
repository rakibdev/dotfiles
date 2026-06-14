local SIDEBAR_WIDTH = 40

return {
  'folke/snacks.nvim',
  sidebarWidth = SIDEBAR_WIDTH, -- exported: require('plugins.explorer').sidebarWidth
  keys = {
    { '<C-b>', function() Snacks.explorer.open() end, desc = 'File explorer' },
  },
  opts = {
    explorer = {},
    picker = {
      actions = {
        open_terminal = function(picker, item)
          if not item then return end
          local cwd = item.dir and item.file or vim.fn.fnamemodify(item.file, ':h')
          require('plugins.terminal.api').new(cwd)
        end,
      },
      sources = {
        explorer = {
          on_change = function(_, item)
            if item and not item.dir then require('utils.git').activeFile = item.file end
          end,
          layout = { preset = 'sidebar', preview = false, hidden = { 'input' }, width = SIDEBAR_WIDTH },
          formatters = {
            file = { filename_only = true },
          },
          hidden      = true,
          ignored     = true,
          git_status  = false,
          exclude     = { 'node_modules', 'build', 'dist', '.git' },
          diagnostics = false,
          win = {
            list = {
              wo = { winfixwidth = true },
              keys = {
                ['<LeftRelease>'] = 'confirm',
                ['<Esc>']        = false,
                ['<C-p>']        = false, -- unblock fff find_files keymap
                ['<C-g>']        = false, -- unblock git panel keymap
                ['<C-c>']        = { 'explorer_yank', mode = { 'n', 'v' } },
                ['t']            = 'open_terminal',
                ['n']            = 'explorer_add',
              },
            },
          },
        },
      },
    },
  },
  config = function(_, opts)
    require('snacks').setup(opts)
    vim.schedule(function() Snacks.explorer.open() end)
  end,
}
