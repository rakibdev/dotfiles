local M = {}
local git    = require('git-panel.utils')
local render = require('git-panel.explorer.render')

local function parseNumstatTotals(output)
  local added, deleted = 0, 0
  for line in output:gmatch('[^\n]+') do
    local a, d = line:match('^(%d+)%s+(%d+)')
    if a then added = added + tonumber(a); deleted = deleted + tonumber(d) end
  end
  return added, deleted
end

local function fetchRepoStats(state)
  local repos = require('utils.git').repoList()
  state.repoStats = state.repoStats or {}

  local function sumStatus(status)
    local added, deleted = 0, 0
    for _, e in ipairs(status.files) do
      added   = added   + (e.added   or 0)
      deleted = deleted + (e.deleted or 0)
    end
    return added, deleted
  end

  local a, d = sumStatus(state.status)
  state.repoStats[state.gitRoot] = { added = a, deleted = d }

  for _, root in ipairs(repos) do
    if root ~= state.gitRoot then
      state.repoStats[root] = { added = 0, deleted = 0 }
      local function onDiff(result)
        if result.code == 0 then
          local ra, rd = parseNumstatTotals(result.stdout or '')
          state.repoStats[root].added   = state.repoStats[root].added   + ra
          state.repoStats[root].deleted = state.repoStats[root].deleted + rd
        end
        vim.schedule(function()
          if state.explorerBuf and vim.api.nvim_buf_is_valid(state.explorerBuf) then
            render.render(state)
          end
        end)
      end
      vim.system({ 'git', 'diff',            '--numstat' }, { cwd = root, text = true }, onDiff)
      vim.system({ 'git', 'diff', '--cached', '--numstat' }, { cwd = root, text = true }, onDiff)
    end
  end
end

function M.selectFile(state, absPath)
  local entry
  for _, e in ipairs(state.status.files) do
    if state.gitRoot .. '/' .. e.path == absPath then entry = e; break end
  end
  if not entry then return end
  state.selected = { entry = entry, group = entry.group }
  render.render(state)
  require('git-panel.diff').open(state)
end

function M.switchRepo(state, root)
  state.gitRoot = root
  require('utils.git').pinnedRoot = root
  vim.cmd('redrawstatus')
  state.selected = nil
  require('git-panel.diff').clear(state)
  require('git-panel.explorer.watcher').start(state)
end

M.refresh = git.async(function(state)
  local err, status = git.getStatus(state.gitRoot)
  if err then
    vim.notify(err, vim.log.levels.ERROR)
    return
  end

  render.sortEntries(status.files)
  state.status = status

  if state.selected then
    local path = state.selected.entry.path
    local foundEntry

    for _, e in ipairs(status.files) do
      if e.path == path then foundEntry = e; break end
    end

    if foundEntry then
      local groupChanged = state.selected.group ~= foundEntry.group
      state.selected.group = foundEntry.group
      state.selected.entry = foundEntry
      if groupChanged then
        require('git-panel.diff').open(state)
      else
        require('git-panel.diff').reload(state)
      end
    else
      state.selected = nil
      require('git-panel.diff').clear(state)
    end
  end

  fetchRepoStats(state)
  render.render(state)

  if state.preselect then
    local filepath = state.preselect
    state.preselect = nil
    M.selectFile(state, filepath)
  end
end)


function M.init(state)
  local SIDEBAR_WIDTH = require('plugins.explorer').sidebarWidth
  local buf = vim.api.nvim_create_buf(false, true)
  vim.bo[buf].buftype    = 'nofile'
  vim.bo[buf].bufhidden  = 'wipe'
  vim.bo[buf].modifiable = false
  vim.bo[buf].swapfile   = false
  pcall(vim.api.nvim_buf_set_name, buf, 'Source Control')
  state.explorerBuf = buf

  local win = state.explorerWin
  vim.api.nvim_win_set_buf(win, buf)
  vim.api.nvim_win_set_width(win, SIDEBAR_WIDTH)
  vim.wo[win].winfixwidth    = true
  vim.wo[win].winfixbuf     = true  -- disables opening files in this window; when explorer is focused and fff opens a file, nvim would open it here instead of diff area
  vim.wo[win].number         = false
  vim.wo[win].relativenumber = false
  vim.wo[win].signcolumn     = 'no'
  vim.wo[win].cursorline     = true
  -- Hide borders and intersection handles to blend window seamlessly
  vim.wo[win].fillchars      = 'eob: ,vert: ,horiz:─,vertleft: '

  local function openAtCursor()
    local lnum = vim.api.nvim_win_get_cursor(win)[1]
    local info = state.lineMap[lnum]
    if not info then return end
    if info.type == 'repo' then
      if not info.isActive then
        M.switchRepo(state, info.root)
        M.refresh(state)
      end
      return
    end
    local absPath = state.gitRoot .. '/' .. info.entry.path
    local stat = vim.uv.fs_stat(absPath)
    if stat and stat.type == 'directory' then return end
    M.selectFile(state, absPath)
  end

  local function getSelectedEntries()
    local mode = vim.fn.mode()
    local startLine, endLine
    if mode == 'v' or mode == 'V' or mode == '\22' then
      startLine = vim.fn.line('v')
      endLine = vim.fn.line('.')
      if startLine > endLine then
        startLine, endLine = endLine, startLine
      end
      vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes("<Esc>", true, false, true), "x", false)
    else
      startLine = vim.api.nvim_win_get_cursor(win)[1]
      endLine = startLine
    end

    local entries = {}
    for lnum = startLine, endLine do
      local info = state.lineMap[lnum]
      if info and info.type ~= 'repo' then
        table.insert(entries, info)
      end
    end
    return entries
  end

  local function stageFiles(action)
    local selected = getSelectedEntries()
    local paths = {}
    for _, info in ipairs(selected) do
      if action == 'stage' and info.group == 'unstaged' then
        table.insert(paths, info.entry.path)
      elseif action == 'unstage' and info.group == 'staged' then
        table.insert(paths, info.entry.path)
      end
    end

    if #paths == 0 then return end

    local gitArgs
    if action == 'stage' then
      gitArgs = vim.list_extend({ 'add', '--' }, paths)
    else
      gitArgs = vim.list_extend({ 'reset', 'HEAD', '--' }, paths)
    end

    vim.system(vim.list_extend({ 'git' }, gitArgs), {
      cwd = state.gitRoot,
      text = true,
    }, function(result)
      vim.schedule(function()
        if result.code == 0 then
          M.refresh(state)
        else
          local errMsg = (result.stderr and result.stderr ~= '') and result.stderr:gsub('%s+$', '') or 'Error'
          vim.notify(errMsg, vim.log.levels.ERROR)
        end
      end)
    end)
  end

  local function discardFiles()
    local selected = getSelectedEntries()
    local targets = {}
    for _, info in ipairs(selected) do
      table.insert(targets, info.entry)
    end

    if #targets == 0 then return end

    local choice = vim.fn.confirm(string.format("Discard changes in %d files? This cannot be undone!", #targets), "&Yes\n&No", 2)
    if choice ~= 1 then return end

    local count = 0
    local function nextDiscard()
      if count == #targets then
        vim.schedule(function() M.refresh(state) end)
        return
      end
      count = count + 1
      local entry = targets[count]
      local cmd
      if entry.status == '??' then
        cmd = { "git", "clean", "-f", "--", entry.path }
      elseif entry.status == 'A' then
        cmd = { "git", "rm", "-f", "--", entry.path }
      else
        cmd = { "git", "checkout", "HEAD", "--", entry.path }
      end

      vim.system(cmd, { cwd = state.gitRoot }, function()
        nextDiscard()
      end)
    end
    nextDiscard()
  end

  local o = { buffer = buf, nowait = true, silent = true }
  vim.keymap.set('n', '<CR>',          openAtCursor, o)
  vim.keymap.set('n', '<LeftRelease>', openAtCursor, o)
  vim.keymap.set({ 'n', 'v' }, '=',   function() stageFiles('stage') end, o)
  vim.keymap.set({ 'n', 'v' }, '-',   function() stageFiles('unstage') end, o)
  vim.keymap.set({ 'n', 'v' }, '_',   discardFiles, o)

  require('git-panel.explorer.watcher').start(state)
  M.refresh(state)
  require('git-panel.explorer.commit').init(state)

  local refreshGroup = vim.api.nvim_create_augroup('GitPanelRefresh', { clear = true })
  vim.api.nvim_create_autocmd({ 'FocusGained', 'BufWritePost' }, {
    group = refreshGroup,
    callback = function()
      if state.explorerBuf and vim.api.nvim_buf_is_valid(state.explorerBuf) then
        M.refresh(state)
      end
    end,
  })

  vim.api.nvim_create_autocmd('WinResized', {
    group = vim.api.nvim_create_augroup('GitPanelExplorerResize', { clear = true }),
    callback = function()
      if state.explorerBuf and vim.api.nvim_buf_is_valid(state.explorerBuf) then
        render.render(state)
      end
    end,
  })
end

return M
