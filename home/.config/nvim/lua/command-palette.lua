local M = {}

local gitUtil    = require('utils.git')
local history    = require('utils.history')
local pickerUtil = require('utils.picker')

local function gitCmd(args, onSuccess)
  local root = gitUtil.getActiveRoot()
  if not root then vim.notify('No git repo found', vim.log.levels.WARN); return end
  vim.system(vim.list_extend({ 'git' }, args), { cwd = root, text = true }, function(result)
    if result.code == 0 then
      if onSuccess then
        vim.schedule(function() onSuccess(result) end)
      end
    else
      local errMsg = (result.stderr and result.stderr ~= '') and result.stderr:gsub('%s+$', '') or tostring(result.code)
      vim.schedule(function() vim.notify(errMsg, vim.log.levels.ERROR) end)
    end
  end)
end

local commands = {
  {
    text   = 'Git Stash',
    action = function()
      gitCmd({ 'stash' }, function() vim.notify('Stashed') end)
    end,
  },
  {
    text   = 'Git Stash Pop',
    action = function()
      gitCmd({ 'stash', 'pop' }, function() vim.notify('Stash applied') end)
    end,
  },
  {
    text   = 'Git Drop Stashes',
    action = function()
      gitCmd({ 'stash', 'clear' }, function()
        vim.notify('All stashes dropped')
      end)
    end,
  },
  {
    text   = 'Git Pull',
    action = function()
      gitCmd({ 'pull' }, function() vim.notify('Pulled') end)
    end,
  },
  {
    text   = 'Git New branch',
    action = function()
      vim.ui.input({ prompt = 'Branch name: ' }, function(name)
        if not name or name == '' then return end
        gitCmd({ 'switch', '-c', name }, function()
          gitCmd({ 'push', '-u', 'origin', name }, function()
            vim.notify('Branch ' .. name .. ' created')
          end)
        end)
      end)
    end,
  },
  {
    text   = 'Git Sync Branches',
    action = function()
      gitCmd({ 'fetch', '--prune' }, function()
        gitCmd({ 'branch', '-vv' }, function(result)
          local toDelete = {}
          for line in (result.stdout or ''):gmatch('[^\r\n]+') do
            if line:match('%[.+: gone%]') then
              local branchName = line:match('^%*?%s*(%S+)')
              if branchName then table.insert(toDelete, branchName) end
            end
          end
          if #toDelete == 0 then vim.notify('No orphan branches'); return end
          gitCmd(vim.list_extend({ 'branch', '-D' }, toDelete), function()
            vim.notify(#toDelete .. ' branch' .. (#toDelete == 1 and '' or 'es') .. ' deleted')
          end)
        end)
      end)
    end,
  },
  {
    text   = 'Open Recent',
    action = function() require('recent-picker').open() end,
  },
}

function M.open()
  local data  = history.load()
  local usage = data.commands or {}

  local sorted = vim.deepcopy(commands)
  table.sort(sorted, function(a, b)
    return (usage[a.text] or 0) > (usage[b.text] or 0)
  end)

  Snacks.picker({
    title   = pickerUtil.title,
    prompt  = pickerUtil.prompt,
    layout  = pickerUtil.layout,
    win     = pickerUtil.win,
    items   = sorted,
    format  = function(item) return { { item.text } } end,
    confirm = function(picker, item)
      picker:close()
      local saved = history.load()
      saved.commands            = saved.commands or {}
      saved.commands[item.text] = os.time()
      history.save(saved)
      item.action()
    end,
  })
end

return M
