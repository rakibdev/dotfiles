local M = {}

local gitUtil = require 'utils.git'
local history = require 'utils.history'
local pickerUtil = require 'utils.picker'

local function gitCmd(args, onSuccess)
	local root = gitUtil.getActiveRoot()
	if not root then
		vim.notify('No git repo found', vim.log.levels.WARN)
		return
	end
	vim.system(vim.list_extend({ 'git' }, args), { cwd = root, text = true }, function(result)
		if result.code == 0 then
			if onSuccess then
				vim.schedule(function()
					onSuccess(result)
				end)
			end
		else
			local errMsg = (result.stderr and result.stderr ~= '') and result.stderr:gsub('%s+$', '')
				or tostring(result.code)
			vim.schedule(function()
				vim.notify(errMsg, vim.log.levels.ERROR)
			end)
		end
	end)
end

local commands = {
	{
		text = 'Stashes',
		action = function()
			require('command-palette.stash').open()
		end,
	},
	{
		text = 'Create Stash',
		action = function()
			gitCmd({ 'stash' }, function()
				vim.notify 'Stashed'
			end)
		end,
	},
	{
		text = 'Apply Stash',
		action = function()
			gitCmd({ 'stash', 'pop' }, function()
				vim.notify 'Stash applied'
			end)
		end,
	},

	{
		text = 'Pull',
		action = function()
			gitCmd({ 'pull' }, function()
				vim.notify 'Pulled'
			end)
		end,
	},
	{
		text = 'New Branch',
		action = function()
			vim.ui.input({ prompt = 'Branch name: ' }, function(name)
				if not name or name == '' then
					return
				end
				gitCmd({ 'switch', '-c', name }, function()
					vim.notify('Branch ' .. name .. ' created')
				end)
			end)
		end,
	},
	{
		text = 'Prune Branches',
		action = function()
			gitCmd({ 'fetch', '--prune' }, function()
				gitCmd({ 'branch', '-vv' }, function(result)
					local toDelete = {}
					for line in (result.stdout or ''):gmatch '[^\r\n]+' do
						if line:match '%[.+: gone%]' then
							local branchName = line:match '^%*?%s*(%S+)'
							if branchName then
								table.insert(toDelete, branchName)
							end
						end
					end
					if #toDelete == 0 then
						vim.notify 'No orphan branches'
						return
					end
					gitCmd(vim.list_extend({ 'branch', '-D' }, toDelete), function()
						vim.notify(#toDelete .. ' branch' .. (#toDelete == 1 and '' or 'es') .. ' deleted')
					end)
				end)
 		end)
 	end,
 },
 {
 	text = 'Undo Last Commit',
 	action = function()
 		local root = gitUtil.getActiveRoot()
 		if not root then
 			vim.notify('No git repo found', vim.log.levels.WARN)
 			return
 		end
 		vim.system({ 'git', 'log', '-1', '--format=%B', 'HEAD' }, { cwd = root, text = true }, function(logResult)
 			vim.schedule(function()
 				if logResult.code ~= 0 then
 					vim.notify(logResult.stderr, vim.log.levels.ERROR)
 					return
 				end
 				local message = vim.trim(logResult.stdout or '')
 				gitCmd({ 'reset', '--soft', 'HEAD~1' }, function()
 					require('git-panel').open()
 					local state = require('git-panel')._state
 					vim.api.nvim_buf_set_lines(state.commitBuf, 0, -1, false, vim.split(message, '\n'))
 					vim.api.nvim_win_set_cursor(state.commitWin, { vim.api.nvim_buf_line_count(state.commitBuf), 0 })
 				end)
 			end)
 		end)
 	end,
 },
 {
	text = 'Open Workspace',
		action = function()
			require('workspace').pick()
		end,
	},
}

function M.open()
	local data = history.load()
	local usage = data.commands or {}

	local sorted = vim.deepcopy(commands)
	for index, command in ipairs(sorted) do
		command.order = index
	end
	table.sort(sorted, function(a, b)
		local usedA, usedB = usage[a.text] or 0, usage[b.text] or 0
		if usedA ~= usedB then
			return usedA > usedB
		end
		return a.order < b.order -- table.sort is unstable, keep declaration order on ties
	end)

	Snacks.picker {
		title = pickerUtil.title,
		prompt = pickerUtil.prompt,
		layout = pickerUtil.layout,
		win = pickerUtil.win,
		items = sorted,
		format = function(item)
			return { { item.text } }
		end,
		confirm = function(picker, item)
			picker:close()
			local saved = history.load()
			saved.commands = saved.commands or {}
			saved.commands[item.text] = os.time()
			history.save(saved)
			-- parent auto sets normal mode, wait then open sub-picker
			vim.schedule(function()
				item.action()
			end)
		end,
	}
end

return M
