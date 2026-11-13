local M = {}

local pickerUtil = require('utils.picker')

function M.open()
  local root = require('utils.git').getActiveRoot()
  if not root then
    vim.notify('Not in a git repo', vim.log.levels.WARN)
    return
  end
  -- background git queries use --no-optional-locks so checkout never fails on index.lock
  Snacks.picker({
    title   = pickerUtil.title,
    prompt  = pickerUtil.prompt,
    layout  = pickerUtil.layout,
    finder  = function()
      local out = vim.system({
        'git', '--no-optional-locks', 'for-each-ref',
        '--format=%(HEAD)\t%(refname)\t%(symref)', 'refs/heads', 'refs/remotes',
      }, { cwd = root, text = true }):wait().stdout
      local items = {}
      for _, line in ipairs(vim.split(out, '\n', { trimempty = true })) do
        local head, ref, symref = unpack(vim.split(line, '\t'))
        if symref == '' then
          local remote = ref:match('^refs/remotes/(.+)$')
          local name = remote or ref:match('^refs/heads/(.+)$')
          items[#items + 1] = { text = name, branch = name, current = head == '*', remote = remote ~= nil }
        end
      end
      return items
    end,
    format  = function(item)
      return { { item.branch, item.current and 'Title' or nil } }
    end,
    on_show = function(picker)
      vim.system({ 'git', '--no-optional-locks', 'fetch', '--prune' }, { cwd = root }, function(result)
        if result.code ~= 0 then return end
        vim.schedule(function()
          if not picker.closed then picker:find() end
        end)
      end)
    end,
    win     = vim.tbl_deep_extend('force', pickerUtil.win or {}, {
      input = {
        keys = {
          ['<Del>'] = { 'delete', mode = { 'n', 'i' } },
        },
      },
    }),
    actions = {
      delete = function(picker, item)
        if not item or not item.branch then return end
        if item.current then
          vim.notify('Cannot delete current branch', vim.log.levels.WARN)
          return
        end
        local branch = item.branch
        if vim.fn.confirm('Delete branch ' .. branch .. '?', '&Yes\n&No', 2) ~= 1 then return end
        vim.system({ 'git', 'branch', '-D', branch }, { cwd = root }, function(result)
          if result.code ~= 0 then
            vim.schedule(function() vim.notify(result.stderr, vim.log.levels.ERROR) end)
            return
          end
          vim.schedule(function() picker:find() end)
          vim.system({ 'git', 'ls-remote', '--exit-code', '--heads', 'origin', branch }, { cwd = root }, function(remote)
            if remote.code ~= 0 then return end
            vim.system({ 'git', 'push', 'origin', '--delete', branch }, { cwd = root }, function(remoteResult)
              if remoteResult.code ~= 0 then
                vim.schedule(function() vim.notify(remoteResult.stderr, vim.log.levels.ERROR) end)
              end
            end)
          end)
        end)
      end,
    },
    confirm = function(picker, item)
      picker:close()
      if not item then return end
      if not item.branch then
        vim.notify('Cannot switch to a detached HEAD entry', vim.log.levels.ERROR)
        return
      end
      local branch = item.remote and item.branch:gsub('^[^/]+/', '') or item.branch
      vim.system({ 'git', 'switch', branch }, { cwd = root }, function(result)
        if result.code ~= 0 then
          vim.schedule(function() vim.notify(result.stderr, vim.log.levels.ERROR) end)
          return
        end
        vim.schedule(function() vim.cmd('redrawstatus!') end)
        vim.system({ 'git', 'pull', '--ff-only' }, { cwd = root }, function(pullResult)
          if pullResult.code ~= 0 then
            vim.schedule(function() vim.notify(pullResult.stderr, vim.log.levels.ERROR) end)
          end
        end)
      end)
    end,
  })
end

return M
