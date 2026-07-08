vim.g.mapleader = '\\'
vim.opt.fillchars = { eob = ' ', vert = ' ', vertright = ' ', vertleft = ' ', verthoriz = ' ' }
vim.opt.cmdheight = 0
vim.opt.mouse = 'a'
vim.opt.sidescroll = 6
vim.opt.keymodel = 'startsel,stopsel' -- shift+arrow starts/stops selection
vim.opt.selectmode = 'key,mouse' -- selection behaves like VSCode (typing replaces)
vim.opt.virtualedit = 'onemore' -- cursor can go one past end of line
vim.opt.whichwrap:append '<,>,[,]' -- wrap left/right arrows to previous/next line at edges

vim.g.loaded_netrw = 1
vim.g.loaded_netrwPlugin = 1
vim.opt.termguicolors = true
vim.opt.clipboard = 'unnamedplus'
vim.opt.guicursor = 'n-c-v:block,i:ver25' -- block cursor normally, line in insert

vim.opt.swapfile = false
vim.opt.number = false
vim.opt.list = false
vim.opt.tabstop = 2
vim.opt.shiftwidth = 2
vim.opt.expandtab = true
vim.opt.updatetime = 800
vim.opt.mousescroll = 'ver:6,hor:6'
vim.opt.mousemodel = 'extend' -- right-click was showing inspect/select all dropdown
vim.opt.diffopt:append 'iwhite'
-- treat hyphen as a word char so word motions don't stop on it.
-- e.g. "google-chrome": by default ctrl+left from the end stops at "-chrome",
-- then "-", then "google" (3 stops). with this it's one word, so ctrl+left
-- jumps straight to the "g". applies everywhere: w/b/e, dw, ciw, *, completion.
vim.opt.iskeyword:append '-'

-- overwrite files in-place. Vite file-watching HMR does not work without this
vim.opt.backupcopy = 'yes'
