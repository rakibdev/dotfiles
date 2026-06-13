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

local function addFile(entry, group, winWidth, lines, lineMap)
  local name = vim.fn.fnamemodify(entry.path, ':t')
  local icon, iconColor = require('nvim-web-devicons').get_icon(name, nil, { default = true })

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

  local parentStr = vim.fn.fnamemodify(entry.path, ':h:t')
  if parentStr == '' or parentStr == '.' then parentStr = nil end

  local prefix  = indent .. icon .. ' '
  local prefixW = vim.api.nvim_strwidth(prefix)
  local badgeW  = vim.api.nvim_strwidth(badge)
  local totalW  = winWidth - rightMargin - prefixW - badgeW - 1

  -- reserve up to 40% for parent, rest for name
  local maxParentW = parentStr and math.min(vim.api.nvim_strwidth(parentStr), math.max(0, math.floor(totalW * 0.4))) or 0
  local maxNameW   = totalW - (parentStr and (maxParentW + 1) or 0)

  if vim.api.nvim_strwidth(name) > maxNameW then
    name = vim.fn.strcharpart(name, 0, maxNameW - 1) .. '…'
  end

  local parentDisplay
  if parentStr then
    local pw = vim.api.nvim_strwidth(parentStr)
    if pw > maxParentW then
      parentStr = '…' .. vim.fn.strcharpart(parentStr, pw - maxParentW + 1)
    end
    parentDisplay = parentStr
  end

  local nameW   = vim.api.nvim_strwidth(name)
  local parentChunk = parentDisplay and (' ' .. parentDisplay) or ''
  local pad     = winWidth - rightMargin - prefixW - nameW - vim.api.nvim_strwidth(parentChunk) - badgeW

  local text       = prefix .. name .. parentChunk .. string.rep(' ', pad) .. badge
  local parentStart = parentDisplay and (#prefix + #name + 1) or nil  -- +1 for space
  local parentEnd   = parentDisplay and (parentStart + #parentDisplay) or nil
  local badgeStart  = #prefix + #name + #parentChunk + pad
  table.insert(lines, text)
  lineMap[#lines] = {
    entry        = entry,
    group        = group,
    iconStart    = #indent,
    iconEnd      = #indent + #icon,
    parentStart  = parentStart,
    parentEnd    = parentEnd,
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

  table.insert(lines, indent .. 'Staged (' .. #staged .. ')')
  for _, e in ipairs(staged) do addFile(e, 'staged', winWidth, lines, lineMap) end

  table.insert(lines, '')

  table.insert(lines, indent .. 'Changes (' .. #unstaged .. ')')
  for _, e in ipairs(unstaged) do addFile(e, 'unstaged', winWidth, lines, lineMap) end

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
      else
        if state.selected
            and state.selected.entry.path == info.entry.path
            and state.selected.group == info.group then
          vim.api.nvim_buf_add_highlight(buf, ns, 'Visual', lnum - 1, 0, -1)
        end
        if info.iconColor then
          vim.api.nvim_buf_add_highlight(buf, ns, info.iconColor, lnum - 1, info.iconStart, info.iconEnd)
        end
        if info.parentStart then
          vim.api.nvim_buf_add_highlight(buf, ns, 'GitPanelDir', lnum - 1, info.parentStart, info.parentEnd)
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
