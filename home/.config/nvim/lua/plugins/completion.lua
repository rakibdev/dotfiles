return {
  'saghen/blink.cmp',
  version = '1.*',
  dependencies = { 'Kaiser-Yang/blink-cmp-dictionary' },
  opts = {
    enabled = function()
      local col = vim.api.nvim_win_get_cursor(0)[2]
      local line = vim.api.nvim_get_current_line()
      local char_after = line:sub(col + 1, col + 1)
      if char_after:match('%w') then return false end
      return true
    end,
    keymap = {
      preset = 'default',
      ['<CR>'] = { 'accept', 'fallback' },
    },
    sources = {
      default = { 'lsp', 'path', 'snippets', 'buffer' },
      per_filetype = {
        markdown = { 'lsp', 'path', 'buffer', 'dictionary' },
        gitcommit = { 'dictionary' },
      },
      providers = {
        dictionary = {
          module = 'blink-cmp-dictionary',
          name = 'Dict',
          score_offset = 20,
          min_keyword_length = 3,
          opts = {
            dictionary_files = {
              vim.fn.expand('~/.config/nvim/lua/plugins/completion/google-10000.txt'),
              vim.fn.expand('~/.config/nvim/lua/plugins/completion/mdn-glossary.txt'),
            },
          },
        },
      },
    },
    completion = {
      documentation = {
        auto_show          = true,
        auto_show_delay_ms = 200,
      },
    },
  },
}
