local M = {}

local pickerUtil = require('utils.picker')
local root       = require('utils.root')

-- a directory argument only sets the explorer's cwd; vim's cwd stays where the
-- launcher was, so git/terminals would all point at the wrong project
vim.api.nvim_create_autocmd('VimEnter', {
  group    = vim.api.nvim_create_augroup('Workspace', { clear = true }),
  callback = function()
    local arg = vim.fn.argv(0)
    if arg ~= '' and vim.fn.isdirectory(arg) == 1 then
      vim.cmd.cd(vim.fn.fnameescape(vim.fn.fnamemodify(arg, ':p')))
    end
  end,
})

function M.open(path)
  -- switching projects while git-panel is open would put the project explorer
  -- next to the git panel's own sidebar
  local gitPanel = require('git-panel')
  if gitPanel.isActive() then gitPanel.close({ carry = false }) end

  -- the welcome screen is a snacks_ buffer, which openFile refuses to reuse, so files
  -- would land in a split next to it
  if vim.bo.filetype == 'snacks_dashboard' then vim.cmd('enew') end

  vim.cmd.cd(vim.fn.fnameescape(path))

  local explorer = Snacks.picker.get({ source = 'explorer' })[1]
  if explorer then
    explorer:set_cwd(path)
    explorer:find()
  else
    Snacks.explorer.open()
  end
end

function M.pick()
  Snacks.picker({
    title   = pickerUtil.title,
    prompt  = pickerUtil.prompt,
    layout  = pickerUtil.layout,
    win     = pickerUtil.win,
    live    = true,
    finder  = function(_, ctx)
      local args = { 'fd', '--type', 'd', '--max-depth', '3' }
      for _, pattern in ipairs(pickerUtil.excluded) do
        vim.list_extend(args, { '--exclude', pattern })
      end
      if ctx.filter.search ~= '' then
        vim.list_extend(args, { '--full-path', ctx.filter.search })
      end

      -- fd has no --sort mtime, so stat + sort after
      local result = vim.system(args, { cwd = root, text = true }):wait()
      local items = {}
      for path in (result.stdout or ''):gmatch('[^\n]+') do
        local file = root .. '/' .. path
        local stat = vim.uv.fs_stat(file)
        table.insert(items, { text = path, file = file, mtime = stat and stat.mtime.sec or 0 })
      end
      table.sort(items, function(a, b) return a.mtime > b.mtime end)
      return items
    end,
    format  = function(item)
      local name   = vim.fn.fnamemodify(item.file, ':t')
      local parent = vim.fn.fnamemodify(item.file, ':~:h')
      return { { name }, { '  ' .. parent, 'SnacksPickerDir' } }
    end,
    confirm = function(picker, item)
      picker:close()
      M.open(item.file)
    end,
  })
end

return M
