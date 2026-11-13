-- run from the nvim config dir:
--   nvim --headless --noplugin -u tests/minimal-init.lua -c "lua MiniTest.run()"
local root = vim.fn.fnamemodify(debug.getinfo(1, 'S').source:sub(2), ':p:h:h')
vim.opt.rtp:prepend(root)

local dep = root .. '/tests/deps/mini.test'
if not vim.uv.fs_stat(dep) then
  vim.fn.system({ 'git', 'clone', '--depth=1', 'https://github.com/nvim-mini/mini.test', dep })
end
vim.opt.rtp:prepend(dep)

require('mini.test').setup({
  collect = {
    find_files = function()
      return vim.fn.globpath(root .. '/tests', '**/*-test.lua', true, true)
    end,
  },
})
