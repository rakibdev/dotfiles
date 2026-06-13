local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.uv.fs_stat(lazypath) then
  vim.fn.system({ "git", "clone", "--filter=blob:none", "https://github.com/folke/lazy.nvim.git", "--branch=stable", lazypath })
end
vim.opt.rtp:prepend(lazypath)

require("options")
require("keymaps")
require("selection")
require("recent-picker")
require("find-replace")
require("lsp")

require("lazy").setup({
  spec = { { import = "plugins" }, { import = "editor" } },
  change_detection = { enabled = false },
})

require("highlights")
require("statusbar").setup()
