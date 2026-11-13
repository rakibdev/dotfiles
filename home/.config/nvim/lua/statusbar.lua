local M = {}

M.fileProvider = nil

local SKIP_FT = { snacks_picker_list = true, [''] = true }
local GAP = '  '
local git = require('utils.git')

local modes = {
	n = { 'N', 'SLNormal' },
	no = { 'N', 'SLNormal' },
	nov = { 'N', 'SLNormal' },
	i = { 'I', 'SLInsert' },
	ic = { 'I', 'SLInsert' },
	v = { 'V', 'SLVisual' },
	V = { 'VL', 'SLVisual' },
	['\22'] = { 'VB', 'SLVisual' },
	s = { 'S', 'SLVisual' },
	S = { 'SL', 'SLNormal' },
	['\19'] = { 'SB', 'SLNormal' },
	R = { 'R', 'SLReplace' },
	Rc = { 'R', 'SLReplace' },
	c = { 'C', 'SLCommand' },
	cv = { 'C', 'SLCommand' },
	t = { 'T', 'SLTerminal' },
}

local function hl(group, text)
	return '%#' .. group .. '#' .. text .. '%#StatusLine#'
end

local function sectionMode()
	local m = modes[vim.fn.mode()]
	if not m then return '' end
	return hl(m[2], ' ' .. m[1] .. ' ')
end

local function sectionBranch()
	local name = git.getBranch()
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
	if errors == 0 and warns == 0 then return '' end

	local err_str = errors > 0 and hl('SLError', '󰅙 ' .. errors) .. ' ' or ''
	local warn_str = warns > 0 and hl('SLWarn', '󰀦 ' .. warns) .. ' ' or ''
	return GAP .. err_str .. warn_str
end

function M.render()
	return table.concat {
		sectionMode(),
		sectionBranch(),
		sectionFile(),
		sectionDiagnostics(),
	}
end

function M.setup()
	-- single global statusline
	vim.opt.laststatus = 3
	vim.opt.statusline = '%!v:lua.require("statusbar").render()'

	_G.StatusbarBranchClick = function()
		require('branch-picker').open()
	end
end

return M
