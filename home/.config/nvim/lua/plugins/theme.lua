local transparent = {
  'Normal', 'NormalNC', 'NormalFloat',
  'FloatBorder', 'TelescopeNormal', 'TelescopeBorder',
  'SignColumn', 'FoldColumn', 'EndOfBuffer',
  'WinSeparator',
}

return {
  { 'rakibdev/material-colors', subdir = 'lua', lazy = false, priority = 1001 },
  {
    dir      = '/home/rakib/Downloads/material-code/nvim',
    name     = 'material-code',
    lazy     = false,
    priority = 1000,
    config   = function()
      local materialCode = require('material-code')
      local path         = vim.fn.expand('~/.config/system-ui/system-ui.json')

      local function applyTheme()
        local f    = io.open(path)
        local config = vim.json.decode(f:read('*a'))
        f:close()
        vim.g.theme  = config
        local dark   = config.darkMode ~= false
        local syntax = materialCode.createSyntaxColors(config.primary, dark)
        local colors = vim.tbl_extend('force', config, {
          syntax = syntax,
          darkMode = dark,
          popover = config.background,
        })
        materialCode.apply(materialCode.createNeovimTheme(colors), dark)
        -- for _, group in ipairs(transparent) do
        --   vim.api.nvim_set_hl(0, group, { bg = 'none' })
        -- end
      end

      applyTheme()
      local watcher = vim.uv.new_fs_event()
      watcher:start(path, {}, function(err, _, events)
        if err or not events.change then return end
        vim.defer_fn(applyTheme, 100)
      end)
    end,
  },
}
