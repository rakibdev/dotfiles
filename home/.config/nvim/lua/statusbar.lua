local M = {}

M.fileProvider = nil

local SKIP_FT = { snacks_picker_list = true, [''] = true }
local GAP = '  '

local modeLabels = {
	n = 'NORMAL',
	no = 'NORMAL',
	nov = 'NORMAL',
	i = 'INSERT',
	ic = 'INSERT',
	v = 'VISUAL',
	V = 'V-LINE',
	['\22'] = 'V-BLOCK',
	s = 'SELECT',
	S = 'S-LINE',
	['\19'] = 'S-BLOCK',
	R = 'REPLACE',
	Rc = 'REPLACE',
	c = 'COMMAND',
	cv = 'COMMAND',
	t = 'TERMINAL',
}

local modeHl = {
	NORMAL = 'SLNormal',
	INSERT = 'SLInsert',
	VISUAL = 'SLVisual',
	['V-LINE'] = 'SLVisual',
	['V-BLOCK'] = 'SLVisual',
	SELECT = 'SLVisual',
	REPLACE = 'SLReplace',
	COMMAND = 'SLCommand',
	TERMINAL = 'SLTerminal',
}

local function hl(group, text)
	return '%#' .. group .. '#' .. text .. '%#StatusLine#'
end

local function sectionMode()
	local raw = vim.fn.mode()
	local label = modeLabels[raw] or raw:upper()
	local group = modeHl[label] or 'SLNormal'
	return hl(group, ' ' .. label .. ' ')
end

local function sectionBranch()
	local name = require('utils.git').getBranch()
	if not name then
		return ''
	end
	local display = #name > 28 and name:sub(1, 25) .. '…' or name
	return GAP .. hl('SLBranch', '%@v:lua.StatusbarBranchClick@ ' .. display .. '%X')
end

local function shortPath(path)
	local parent = vim.fn.fnamemodify(path, ':h:t')
	local file   = vim.fn.fnamemodify(path, ':t')
	if parent == '' or parent == '.' then return file end
	return parent .. '/' .. file
end

local function renderFileSection(relativePath, isModified)
	if relativePath == '' then
		return ''
	end
	relativePath = shortPath(relativePath)
	if #relativePath > 40 then
		relativePath = '…' .. relativePath:sub(-37)
	end
	local out = GAP .. hl('SLFile', relativePath)
	if isModified then
		out = out .. hl('SLModified', ' ●')
	end
	return out
end

local function sectionFile()
	if M.fileProvider then
		local path, isModified = M.fileProvider()
		return renderFileSection(path or '', isModified)
	end
	if SKIP_FT[vim.bo.filetype] then
		return ''
	end
	return renderFileSection(vim.fn.expand '%:~:.', vim.bo.modified)
end

local function sectionDiagnostics()
	local counts = vim.diagnostic.count(0)
	local errors = counts[vim.diagnostic.severity.ERROR] or 0
	local warns = counts[vim.diagnostic.severity.WARN] or 0
	local out = ''
	if errors > 0 then
		out = out .. hl('SLError', '󰅙 ' .. errors) .. ' '
	end
	if warns > 0 then
		out = out .. hl('SLWarn', '󰀦 ' .. warns) .. ' '
	end
	if out ~= '' then
		out = GAP .. out
	end
	return out
end

function M.render()
	return table.concat {
		sectionMode(),
		sectionBranch(),
		sectionFile(),
		sectionDiagnostics(),
		'%=',
	}
end

function M.setup()
	-- single global statusline
	vim.opt.laststatus = 3
	vim.opt.statusline = '%!v:lua.Statusbar()'

	_G.Statusbar = M.render
	_G.StatusbarBranchClick = function()
		require('branch-picker').open()
	end
end

return M
