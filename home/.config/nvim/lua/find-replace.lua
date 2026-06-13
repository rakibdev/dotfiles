vim.opt.hlsearch = true
vim.opt.ignorecase = true
vim.opt.smartcase = true

local function feed(keys)
	vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes(keys, true, true, true), 'n', false)
end

local function search(text)
	feed('<Esc>/\\V' .. vim.fn.escape(text, '/\\') .. '<CR>')
end

local function visualSelection()
	local old, oldType = vim.fn.getreg 'q', vim.fn.getregtype 'q'
	vim.cmd 'normal! "qy'
	local text = vim.fn.getreg 'q'
	vim.fn.setreg('q', old, oldType)
	-- remove carriage returns and replace newlines/tabs with spaces
	return text:gsub('\r', ''):gsub('\n', ' '):gsub('\t', ' ')
end

local function replace(text)
	local escaped = vim.fn.escape(text, '/\\')
	feed('<Esc>:%s/\\V' .. escaped .. '/' .. text .. '/g<Left><Left>')
end

-- <cword> stops at non-word chars like < > ( ) — e.g. cursor on "<Component" searches "Component"
vim.keymap.set({ 'n', 'i' }, '<C-f>', function()
	local word = vim.fn.expand '<cword>'
	if word ~= '' then
		search(word)
	else
		feed '<Esc>/'
	end
end)
vim.keymap.set({ 'v', 's' }, '<C-f>', function()
	search(visualSelection())
end)

vim.keymap.set('n', '<C-h>', function()
	replace(vim.fn.expand '<cword>')
end)
vim.keymap.set('v', '<C-h>', function()
	replace(visualSelection())
end)

-- Esc to exit search
vim.keymap.set('n', '<Esc>', '<cmd>nohlsearch<CR>', { silent = true })

-- Enter / Shift+Enter navigate matches when search is active
vim.keymap.set('n', '<CR>', function()
	return vim.v.hlsearch == 1 and 'n' or '<CR>'
end, { expr = true })

vim.keymap.set('n', '<S-CR>', function()
	return vim.v.hlsearch == 1 and 'N' or '<S-CR>'
end, { expr = true })
