local M = {}

local function fileIcon(path)
  local name = vim.fn.fnamemodify(path, ':t')
  return require('nvim-web-devicons').get_icon(name, nil, { default = true })
end

local function syncGitPanel(filePath)
  local gpState = require('git-panel')._state
  if not (gpState and gpState.tab and vim.api.nvim_tabpage_is_valid(gpState.tab)) then return end
  local fileRepo
  for _, root in ipairs(require('utils.git').repoList()) do
    if filePath:sub(1, #root + 1) == root .. '/' then
      if not fileRepo or #root > #fileRepo then fileRepo = root end
    end
  end
  if not fileRepo then return end
  local explorer = require('git-panel.explorer')
  if fileRepo ~= gpState.gitRoot then
    explorer.switchRepo(gpState, fileRepo)
    gpState.preselect = filePath
    explorer.refresh(gpState)
  else
    explorer.selectFile(gpState, filePath)
  end
end

local pickerUtil = require('utils.picker')

local layout = vim.tbl_deep_extend('force', pickerUtil.layout, {
  layout = { width = 0.6, height = 0.8 },
})

local win = vim.tbl_deep_extend('force', pickerUtil.win, {
  list = { wo = { winhighlight = 'CursorLine:FffSelected' } },
})

function M.findFiles()
  Snacks.picker.pick({
    prompt  = pickerUtil.prompt,
    live    = true,
    layout  = layout,
    win     = win,
    sort    = { fields = { 'idx' } },
    finder = function(opts, ctx)
      local result = require('fff').file_search(ctx.filter.search or '')
      return vim.tbl_map(function(item)
        return { text = item.relative_path, file = item.relative_path }
      end, result.items)
    end,
    format = function(item)
      local icon, color = fileIcon(item.file)
      return { { icon .. ' ', color }, { item.text } }
    end,
    confirm = function(p, item)
      p:close()
      -- file was opening inside commit box when it was focused
      local gpState = require('git-panel')._state
      if vim.api.nvim_win_is_valid((gpState or {}).diffAreaWin or -1) then
        vim.api.nvim_set_current_win(gpState.diffAreaWin)
      end
      vim.cmd('edit ' .. vim.fn.fnameescape(item.file))
      syncGitPanel(vim.fn.expand('%:p'))
    end,
  })
end

function M.liveGrep()
  Snacks.picker.pick({
    prompt  = pickerUtil.prompt,
    live    = true,
    layout  = layout,
    win     = win,
    sort    = { fields = { 'idx' } },
    finder = function(opts, ctx)
      local query = ctx.filter.search or ''
      if query == '' then return {} end
      local result = require('fff').content_search(query, { mode = 'plain' })
      local items, lastFile = {}
      for _, item in ipairs(result.items) do
        if item.relative_path ~= lastFile then
          lastFile = item.relative_path
          table.insert(items, { text = item.relative_path, file = item.relative_path, isHeader = true })
        end
        table.insert(items, {
          text = item.relative_path .. ':' .. (item.line_number or 0),
          file = item.relative_path,
          pos  = { item.line_number or 1, item.col or 0 },
          line = item.line_content or '',
        })
      end
      return items
    end,
    format = function(item)
      if item.isHeader then
        local icon, color = fileIcon(item.file)
        return { { icon .. ' ', color }, { item.text, 'Comment' } }
      end
      return {
        { item.pos[1] .. '  ', 'Comment' },
        { item.line,           ''        },
      }
    end,
    confirm = function(p, item)
      if item.isHeader then return end
      p:close()
      vim.cmd('edit ' .. vim.fn.fnameescape(item.file))
      vim.api.nvim_win_set_cursor(0, item.pos)
    end,
  })
end

return {
  'dmtrKovalenko/fff.nvim',
  build = function() require('fff.download').download_or_build_binary() end,
  lazy  = false,
  keys  = {
    { '<C-p>', function() M.findFiles() end, desc = 'Find files' },
    { 'ff',    function() M.liveGrep() end,  desc = 'Live grep'  },
  },
  config = function()
    require('fff').setup()
    local function applyHl()
      local p = vim.api.nvim_get_hl(0, { name = 'Title', link = false }).fg
      if p then
        vim.api.nvim_set_hl(0, 'FffSelected',       { bg = p, fg = '#1a1a1a', bold = true })
        vim.api.nvim_set_hl(0, 'SnacksPickerMatch', { bg = p, fg = '#1a1a1a' })
      end
    end
    applyHl()
    vim.api.nvim_create_autocmd('ColorScheme', {
      group    = vim.api.nvim_create_augroup('FffHighlights', { clear = true }),
      callback = applyHl,
    })
  end,
}
