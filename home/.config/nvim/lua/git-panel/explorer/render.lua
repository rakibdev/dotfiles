local M = {}
local ns     = vim.api.nvim_create_namespace('git_panel_explorer')
local indent = ' '
local rightMargin = 2


function M.sortEntries(entries)
  table.sort(entries, function(a, b)
    local rA = (a.status == 'A' or a.status == '??' or a.status == '?') and 1 or (a.status == 'D' and 3 or 2)
    local rB = (b.status == 'A' or b.status == '??' or b.status == '?') and 1 or (b.status == 'D' and 3 or 2)
    if rA ~= rB then return rA < rB end
    return a.path < b.path
  end)
end

local function shortDir(dir)
  local parts = {}
  for seg in dir:gmatch('[^/]+') do table.insert(parts, seg) end
  local len = #parts
  if len <= 2 then return dir end
  return parts[len - 1] .. '/' .. parts[len]
end

local function addDirHeader(dir, lines, lineMap)
  table.insert(lines, indent .. shortDir(dir))
  lineMap[#lines] = { type = 'dir' }
end

local function addFile(entry, group, gitRoot, winWidth, lines, lineMap)
  local name = vim.fn.fnamemodify(entry.path, ':t')
  local stat = vim.uv.fs_lstat(gitRoot .. '/' .. entry.path)
  local isSymlink = stat and stat.type == 'link'
  local icon, iconColor
  if isSymlink then
    icon, iconColor = '↩', 'GitPanelDir'
  else
    icon, iconColor = require('nvim-web-devicons').get_icon(name, nil, { default = true })
  end

  local isDelete = entry.status == 'D'
  local addedPart   = (entry.added or 0) > 0 and ('+' .. entry.added) or nil
  local deletedPart = (entry.deleted or 0) > 0 and ('-' .. entry.deleted) or nil

  local badge
  if isDelete then
    badge = 'D'
  elseif addedPart and deletedPart then
    badge = addedPart .. ' ' .. deletedPart
  else
    badge = addedPart or deletedPart or ''
  end

  local prefix  = indent .. indent .. icon .. ' '
  local prefixW = vim.api.nvim_strwidth(prefix)
  local badgeW  = vim.api.nvim_strwidth(badge)
  local maxNameW = winWidth - rightMargin - prefixW - badgeW - 1

  if vim.api.nvim_strwidth(name) > maxNameW then
    name = vim.fn.strcharpart(name, 0, maxNameW - 1) .. '…'
  end

  local nameW      = vim.api.nvim_strwidth(name)
  local pad        = winWidth - rightMargin - prefixW - nameW - badgeW
  local badgeStart = #prefix + #name + pad
  local text       = prefix .. name .. string.rep(' ', pad) .. badge
  table.insert(lines, text)
  lineMap[#lines] = {
    entry        = entry,
    group        = group,
    iconStart    = #indent + #indent,
    iconEnd      = #indent + #indent + #icon,
    badgeStart   = badgeStart,
    badgeEnd     = badgeStart + #badge,
    addedStart   = addedPart   and badgeStart                              or nil,
    addedEnd     = addedPart   and badgeStart + #addedPart                 or nil,
    deletedStart = deletedPart and badgeStart + (addedPart and #addedPart + 1 or 0) or nil,
    deletedEnd   = deletedPart and badgeStart + (addedPart and #addedPart + 1 or 0) + #deletedPart or nil,
    isDelete     = isDelete,
    iconColor    = iconColor,
  }
end

function M.render(state)
  local buf = state.explorerBuf
  local win = state.explorerWin
  if not buf or not vim.api.nvim_buf_is_valid(buf) then return end
  if not win or not vim.api.nvim_win_is_valid(win) then return end

  local winWidth = vim.api.nvim_win_get_width(win)
  local gitRoot  = state.gitRoot
  local lines    = {}
  local lineMap  = {}

  -- repo list (only when more than one repo)
  local repos = require('utils.git').repoList()
  if #repos > 1 then
    table.insert(lines, indent .. 'Repositories')
    for _, root in ipairs(repos) do
      local name     = vim.fn.fnamemodify(root, ':t')
      local isActive = root == state.gitRoot
      local prefix   = indent .. (isActive and '● ' or '○ ')
      local prefixW  = vim.api.nvim_strwidth(prefix)

      local stats = state.repoStats and state.repoStats[root]
      local addedPart   = stats and stats.added > 0 and ('+' .. stats.added) or nil
      local deletedPart = stats and stats.deleted > 0 and ('-' .. stats.deleted) or nil

      local badge
      if addedPart and deletedPart then
        badge = addedPart .. ' ' .. deletedPart
      else
        badge = addedPart or deletedPart or ''
      end

      local badgeW   = vim.api.nvim_strwidth(badge)
      local maxNameW = winWidth - rightMargin - prefixW - badgeW - 1
      if vim.api.nvim_strwidth(name) > maxNameW then
        name = vim.fn.strcharpart(name, 0, maxNameW - 1) .. '…'
      end
      local pad      = winWidth - rightMargin - prefixW - vim.api.nvim_strwidth(name) - badgeW
      local text     = prefix .. name .. string.rep(' ', pad) .. badge
      local badgeStart = #prefix + #name + pad
      table.insert(lines, text)
      lineMap[#lines] = {
        type         = 'repo',
        root         = root,
        isActive     = isActive,
        badgeStart   = badgeStart,
        badgeEnd     = badgeStart + #badge,
        addedStart   = addedPart   and badgeStart                              or nil,
        addedEnd     = addedPart   and badgeStart + #addedPart                 or nil,
        deletedStart = deletedPart and badgeStart + (addedPart and #addedPart + 1 or 0) or nil,
        deletedEnd   = deletedPart and badgeStart + (addedPart and #addedPart + 1 or 0) + #deletedPart or nil,
      }
    end
    table.insert(lines, '')
  end

  local staged, unstaged = {}, {}
  for _, e in ipairs(state.status.files) do
    if e.group == 'staged' then table.insert(staged, e)
    else table.insert(unstaged, e) end
  end

  local function renderGroup(entries, group)
    local byDir = {}
    local dirOrder = {}
    for _, e in ipairs(entries) do
      local dir = vim.fn.fnamemodify(e.path, ':h')
      if dir == '.' then dir = '' end
      if not byDir[dir] then
        byDir[dir] = {}
        table.insert(dirOrder, dir)
      end
      table.insert(byDir[dir], e)
    end
    for _, dir in ipairs(dirOrder) do
      if dir ~= '' then addDirHeader(dir, lines, lineMap) end
      for _, e in ipairs(byDir[dir]) do addFile(e, group, gitRoot, winWidth, lines, lineMap) end
    end
  end

  table.insert(lines, indent .. 'Staged (' .. #staged .. ')')
  renderGroup(staged, 'staged')

  table.insert(lines, '')

  table.insert(lines, indent .. 'Changes (' .. #unstaged .. ')')
  renderGroup(unstaged, 'unstaged')

  state.lineMap = lineMap

  vim.bo[buf].modifiable = true
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  vim.bo[buf].modifiable = false
  vim.api.nvim_buf_clear_namespace(buf, ns, 0, -1)

  for lnum, line in ipairs(lines) do
    local info = lineMap[lnum]
    if info then
      if info.type == 'repo' then
        if info.isActive then
          vim.api.nvim_buf_add_highlight(buf, ns, 'GitPanelHeading', lnum - 1, 0, -1)
        end
        if info.addedStart then
          vim.api.nvim_buf_add_highlight(buf, ns, 'GitPanelAdd', lnum - 1, info.addedStart, info.addedEnd)
        end
        if info.deletedStart then
          vim.api.nvim_buf_add_highlight(buf, ns, 'GitPanelDelete', lnum - 1, info.deletedStart, info.deletedEnd)
        end
      elseif info.type == 'dir' then
        vim.api.nvim_buf_add_highlight(buf, ns, 'GitPanelDir', lnum - 1, 0, -1)
      else
        if state.selected
            and state.selected.entry.path == info.entry.path
            and state.selected.group == info.group then
          vim.api.nvim_buf_add_highlight(buf, ns, 'Visual', lnum - 1, 0, -1)
        end
        if info.iconColor then
          vim.api.nvim_buf_add_highlight(buf, ns, info.iconColor, lnum - 1, info.iconStart, info.iconEnd)
        end
        if info.isDelete then
          vim.api.nvim_buf_add_highlight(buf, ns, 'GitPanelDelete', lnum - 1, info.badgeStart, info.badgeEnd)
        else
          if info.addedStart then
            vim.api.nvim_buf_add_highlight(buf, ns, 'GitPanelAdd', lnum - 1, info.addedStart, info.addedEnd)
          end
          if info.deletedStart then
            vim.api.nvim_buf_add_highlight(buf, ns, 'GitPanelDelete', lnum - 1, info.deletedStart, info.deletedEnd)
          end
        end
      end
    elseif line:match('^' .. indent .. 'Staged')
        or line:match('^' .. indent .. 'Changes')
        or line:match('^' .. indent .. 'Repositories') then
      vim.api.nvim_buf_add_highlight(buf, ns, 'GitPanelHeading', lnum - 1, 0, -1)
    end
  end
end

return M
