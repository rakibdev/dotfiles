local M = {}

local history     = require('utils.history')
local pickerUtil  = require('utils.picker')
local MAX_HISTORY = 50
local MAX_ITEMS   = 10

vim.api.nvim_create_autocmd({ 'VimEnter', 'DirChanged' }, {
  group    = vim.api.nvim_create_augroup('RecentPicker', { clear = true }),
  callback = function()
    local path = vim.fn.getcwd()
    local data = history.load()
    data.dirs = vim.tbl_filter(function(d) return d ~= path end, data.dirs)
    table.insert(data.dirs, 1, path)
    if #data.dirs > MAX_HISTORY then data.dirs = vim.list_slice(data.dirs, 1, MAX_HISTORY) end
    history.save(data)
  end,
})

function M.open()
  local cwd   = vim.fn.getcwd()
  local items = {}

  for _, dir in ipairs(history.load().dirs) do
    if #items == MAX_ITEMS then break end
    if dir ~= cwd and vim.fn.isdirectory(dir) == 1 then
      table.insert(items, { path = dir, text = dir })
    end
  end

  Snacks.picker({
    title      = '',
    prompt     = ' ',
    layout     = pickerUtil.layout,
    win        = pickerUtil.win,
    items   = items,
    format  = function(item)
      local name   = vim.fn.fnamemodify(item.path, ':t')
      local parent = vim.fn.fnamemodify(item.path, ':~:h')
      return { { name }, { '  ' .. parent, 'SnacksPickerDir' } }
    end,
    confirm = function(picker, item)
      picker:close()
      vim.cmd('cd ' .. vim.fn.fnameescape(item.path))
      if not Snacks.picker.get({ source = 'explorer' })[1] then
        Snacks.explorer.open()
      end
    end,
  })
end

return M
