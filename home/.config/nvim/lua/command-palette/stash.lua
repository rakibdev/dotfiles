local M = {}

local gitUtil    = require('utils.git')
local pickerUtil = require('utils.picker')

function M.open()
  local root = gitUtil.getActiveRoot()
  if not root then
    vim.notify('Not in a git repo', vim.log.levels.WARN)
    return
  end

  Snacks.picker.git_stash({
    title   = pickerUtil.title,
    prompt  = pickerUtil.prompt,
    cwd     = root,
    layout  = pickerUtil.layout,
    win     = {
      input = {
        keys = {
          ['<Esc>'] = { 'cancel', mode = { 'n', 'i' } },
          ['<C-d>'] = { 'drop',   mode = { 'n', 'i' } },
        },
      },
    },
    actions = {
      drop = function(picker, item)
        if not item or not item.stash then return end
        vim.ui.confirm('Drop ' .. item.stash .. '?', {}, function(confirmed)
          if not confirmed then return end
          vim.system({ 'git', 'stash', 'drop', item.stash }, { cwd = root }, function(result)
            if result.code ~= 0 then
              vim.schedule(function() vim.notify(result.stderr, vim.log.levels.ERROR) end)
              return
            end
            vim.schedule(function() picker:find() end)
          end)
        end)
      end,
    },
    confirm = function(picker, item)
      picker:close()
      if not item or not item.stash then return end
      vim.system({ 'git', 'stash', 'apply', item.stash }, { cwd = root }, function(result)
        if result.code ~= 0 then
          vim.schedule(function() vim.notify(result.stderr, vim.log.levels.ERROR) end)
          return
        end
        vim.schedule(function() vim.cmd.checktime() end)
      end)
    end,
  })
end

return M
