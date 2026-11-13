local copyClean = require('selection').copyClean

vim.keymap.set('n', '<C-q>', '<cmd>qa<CR>')

-- comment toggle (native gc, nvim 0.10+)
vim.keymap.set('n', '<C-/>', 'gcc', { remap = true })
vim.keymap.set('x', '<C-/>', 'gc', { remap = true })
vim.keymap.set('s', '<C-/>', '<C-g>gc', { remap = true })
vim.keymap.set('i', '<C-/>', '<cmd>norm gcc<CR>')

-- word jump
vim.keymap.set({'n','v'}, '<C-Left>',  'b')
vim.keymap.set({'n','v'}, '<C-Right>', 'w')
vim.keymap.set('i', '<C-Left>',  '<C-o>b')
vim.keymap.set('i', '<C-Right>', '<C-o>w')

-- move by display rows so wrapped lines don't get skipped
for key, motion in pairs({ Up = 'gk', Down = 'gj' }) do
  vim.keymap.set({'n','x'}, '<' .. key .. '>', motion)
  vim.keymap.set('i', '<' .. key .. '>', '<C-o>' .. motion)
  vim.keymap.set('n', '<S-' .. key .. '>', 'v' .. motion .. '<C-g>')
  vim.keymap.set('i', '<S-' .. key .. '>', '<C-o>v' .. motion .. '<C-g>')
  vim.keymap.set('x', '<S-' .. key .. '>', motion)
  vim.keymap.set('s', '<S-' .. key .. '>', '<C-o>' .. motion)
end

-- ctrl+backspace delete word
vim.keymap.set('i', '<C-H>',  '<C-W>', { noremap = true })
vim.keymap.set('i', '<C-BS>', '<C-W>', { noremap = true })
vim.keymap.set('c', '<C-H>',  '<C-W>', { noremap = true })

-- save / undo / redo
vim.keymap.set({'n','v','s'}, '<C-s>', '<cmd>silent w<CR>')  -- silent disables ctrl+s save messages in command line
vim.keymap.set('i', '<C-s>', '<Esc><cmd>silent w<CR>a')
vim.keymap.set({'n','i','v','s'}, '<C-z>', '<cmd>undo<CR>')
vim.keymap.set({'n','i','v','s'}, '<C-y>', '<cmd>redo<CR>')
vim.keymap.set({'n','i','v','s'}, '<C-S-z>', '<Nop>')
vim.keymap.set('n', 'u', '<Nop>') -- disable undo, use <C-z> instead

-- select all
vim.keymap.set('n', '<C-a>', 'ggVG<C-g>', { desc = 'Select all' })
vim.keymap.set({'v', 's'}, '<C-a>', '<Esc>ggVG<C-g>', { desc = 'Select all' })
vim.keymap.set('i', '<C-a>', '<Esc>ggVG<C-g>', { desc = 'Select all' })

-- copy / cut
vim.keymap.set('v', '<C-c>', function()
  -- empty buftype means editor area. copy exactly.
  if vim.bo.buftype == "" then
    vim.cmd('normal! "+y')
  else
    copyClean()
  end
end)
vim.keymap.set('s', '<C-c>', '<C-g>"+y')
vim.keymap.set('v', '<C-x>', '"+d')
vim.keymap.set('s', '<C-x>', '<C-g>"+d')
-- cut line if no selection
vim.keymap.set('n', '<C-x>', '"+dd')
vim.keymap.set('i', '<C-x>', '<Esc>"+ddi')

-- Tab / Shift-Tab to indent / outdent selection
vim.keymap.set({'v','s'}, '<Tab>', '>gv')
vim.keymap.set({'v','s'}, '<S-Tab>', '<gv')

-- Alt+Arrow to move line / selection up / down
vim.keymap.set('n', '<A-Up>', '<cmd>m .-2<CR>==')
vim.keymap.set('n', '<A-Down>', '<cmd>m .+1<CR>==')
vim.keymap.set('i', '<A-Up>', '<Esc><cmd>m .-2<CR>==gi')
vim.keymap.set('i', '<A-Down>', '<Esc><cmd>m .+1<CR>==gi')
vim.keymap.set({'v','s'}, '<A-Up>', "<cmd>'<,'>m '<-2<CR>gv=gv")
vim.keymap.set({'v','s'}, '<A-Down>', "<cmd>'<,'>m '>+1<CR>gv=gv")

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
vim.keymap.set('i', '<C-S-Right>', '<C-o>vw<C-g>')
vim.keymap.set('i', '<C-S-Left>',  '<C-o>vb<C-g>')
vim.keymap.set({'v','s'}, '<C-S-Right>', word_extend('w'))
vim.keymap.set({'v','s'}, '<C-S-Left>',  word_extend('b'))

-- alt+wheel → horizontal scroll
vim.keymap.set({'n', 'v', 'i'}, '<A-ScrollWheelUp>', '<ScrollWheelLeft>')
vim.keymap.set({'n', 'v', 'i'}, '<A-ScrollWheelDown>', '<ScrollWheelRight>')

vim.keymap.set('n', '<M-Left>', '<C-o>', { desc = 'Jump backward in history' })

vim.keymap.set('n', '<M-Right>', '<C-i>', { desc = 'Jump forward in history' })

vim.keymap.set({ 'n', 'i' }, '<F1>', function() require('command-palette').open() end)

