vim.keymap.set('n', '<C-q>', '<cmd>qa<CR>')

-- comment toggle (native gc, nvim 0.10+)
vim.keymap.set('n', '<C-/>', 'gcc', { remap = true })
vim.keymap.set('x', '<C-/>', 'gc', { remap = true })
vim.keymap.set('i', '<C-/>', '<cmd>norm gcc<CR>')

local function open_diag()
  local bufnr, winnr = vim.diagnostic.open_float({
    focusable    = true,
    focus        = true,
    close_events = {}, -- selecting text was closing the float
    border       = 'rounded',
    source       = true,
  })
  if not winnr then return end
  local close = function() pcall(vim.api.nvim_win_close, winnr, true) end
  -- map both modes so Esc closes instantly without first exiting visual
  vim.keymap.set({ 'n', 'v' }, '<Esc>', close, { buffer = bufnr, nowait = true })
  vim.keymap.set('v', '<C-c>', '"+y', { buffer = bufnr, nowait = true })
end

vim.keymap.set('n', '<leader>d', open_diag)

-- word jump
vim.keymap.set({'n','v'}, '<C-Left>',  'b')
vim.keymap.set({'n','v'}, '<C-Right>', 'w')
vim.keymap.set('i', '<C-Left>',  '<C-o>b')
vim.keymap.set('i', '<C-Right>', '<C-o>w')

-- ctrl+backspace delete word
vim.keymap.set('i', '<C-H>',  '<C-W>', { noremap = true })
vim.keymap.set('i', '<C-BS>', '<C-W>', { noremap = true })
vim.keymap.set('c', '<C-H>',  '<C-W>', { noremap = true })

-- save / undo / redo
vim.keymap.set({'n','v','s'}, '<C-s>', '<cmd>silent w<CR>')  -- silent disables ctrl+s save messages in command line
vim.keymap.set('i', '<C-s>', '<Esc><cmd>silent w<CR>a')
vim.keymap.set({'n','i','v','s'}, '<C-z>', '<cmd>undo<CR>')
vim.keymap.set({'n','i','v','s'}, '<C-y>', '<cmd>redo<CR>')
-- prevent accidental suspend when holding shift during redo
vim.keymap.set({'n','i','v','s'}, '<C-S-z>', '<Nop>')

local copyText = require('selection').copyText

-- copy / cut
vim.keymap.set('v', '<C-c>', copyText)
vim.keymap.set('s', '<C-c>', '<C-g>"+y')
vim.keymap.set('v', '<C-x>', '"+d')
vim.keymap.set('s', '<C-x>', '<C-g>"+d')
-- cut line if no selection
vim.keymap.set('n', '<C-x>', '"+dd')
vim.keymap.set('i', '<C-x>', '<Esc>"+ddi')

-- Tab / Shift-Tab to indent / outdent selection
vim.keymap.set('s', '<Tab>', '<C-g>>gv<C-g>')
vim.keymap.set('s', '<S-Tab>', '<C-g><gv<C-g>')

-- Alt+Arrow to move line / selection up / down
vim.keymap.set('n', '<A-Up>', '<cmd>m .-2<CR>==')
vim.keymap.set('n', '<A-Down>', '<cmd>m .+1<CR>==')
vim.keymap.set('i', '<A-Up>', '<Esc><cmd>m .-2<CR>==gi')
vim.keymap.set('i', '<A-Down>', '<Esc><cmd>m .+1<CR>==gi')
vim.keymap.set('s', '<A-Up>', "<C-g><cmd>'<,'>m '<-2<CR>gv=gv<C-g>")
vim.keymap.set('s', '<A-Down>', "<C-g><cmd>'<,'>m '>+1<CR>gv=gv<C-g>")

-- ctrl+shift+arrow → word selection in SELECT mode (keymodel covers plain shift, not ctrl variant).
-- not using plain `<C-g>w<C-g>` because at the buffer end it removes the selection.
local function word_extend(motion)
  return function()
    vim.cmd('normal! \28\14gv')          -- <C-\><C-N> → normal, then gv restores selection
    pcall(vim.cmd, 'normal! ' .. motion) -- pcall: motion at boundary won't error
    vim.api.nvim_feedkeys(vim.api.nvim_replace_termcodes('<C-g>', true, false, true), 'n', false)
  end
end
vim.keymap.set('n', '<C-S-Right>', 'vw<C-g>')
vim.keymap.set('n', '<C-S-Left>',  'vb<C-g>')
vim.keymap.set({'v','s'}, '<C-S-Right>', word_extend('w'))
vim.keymap.set({'v','s'}, '<C-S-Left>',  word_extend('b'))

-- alt+wheel → horizontal scroll
vim.keymap.set({'n', 'v', 'i'}, '<A-ScrollWheelUp>', '<ScrollWheelLeft>')
vim.keymap.set({'n', 'v', 'i'}, '<A-ScrollWheelDown>', '<ScrollWheelRight>')

vim.keymap.set('n', '<C-p>', function() require('recent-picker').open() end)

vim.keymap.set('n', '<M-Left>', '<C-o>', { desc = 'Jump backward in history' })

vim.keymap.set('n', '<M-Right>', '<C-i>', { desc = 'Jump forward in history' })

vim.keymap.set({ 'n', 'i' }, '<F1>', function() require('command-palette').open() end)

