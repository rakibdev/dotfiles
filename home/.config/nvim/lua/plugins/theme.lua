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
      local configPath   = vim.fn.expand('~/.config/system-ui/system-ui.json')

      local function readJson(path)
        local f = io.open(path)
        if not f then return {} end
        local data = vim.json.decode(f:read('*a'))
        f:close()
        return data or {}
      end

      local function applyTheme()
        local config = readJson(configPath)
        local theme  = config.theme or {}
        local dark   = config.darkMode ~= false
        local syntax = materialCode.createSyntaxColors(theme.primary, dark)
        local colors = vim.tbl_extend('force', theme, {
          syntax   = syntax,
          darkMode = dark,
          popover  = theme.background,
        })
        materialCode.apply(materialCode.createNeovimTheme(colors), dark)
        vim.api.nvim_exec_autocmds('ColorScheme', { pattern = 'material-code' })
        -- for _, group in ipairs(transparent) do
        --   vim.api.nvim_set_hl(0, group, { bg = 'none' })
        -- end
      end

      applyTheme()
      local watcher = vim.uv.new_fs_event()
      watcher:start(configPath, {}, function(err, _, events)
        if err or not events.change then return end
        vim.defer_fn(applyTheme, 100)
      end)
    end,
  },
}
