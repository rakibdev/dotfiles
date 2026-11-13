-- shared width for both sidebars (snacks explorer + git-panel explorer).
-- they swap places in the same tab, so a resize in one is remembered and
-- applied to the other when it opens.
local M = { width = 40 }

local function isSidebar(win)
  if not vim.api.nvim_win_is_valid(win) then return false end
  local buf = vim.api.nvim_win_get_buf(win)
  local name = vim.api.nvim_buf_get_name(buf)
  return vim.bo[buf].filetype == 'snacks_picker_list' or name:match('Source Control$') ~= nil
end

function M.apply(win)
  if win and vim.api.nvim_win_is_valid(win) then
    vim.api.nvim_win_set_width(win, M.width)
  end
end

function M.setup()
  vim.api.nvim_create_autocmd('WinResized', {
    group = vim.api.nvim_create_augroup('SidebarWidth', { clear = true }),
    callback = function()
      for _, win in ipairs(vim.v.event.windows or {}) do
        if isSidebar(win) then
          M.width = vim.api.nvim_win_get_width(win)
          return
        end
      end
    end,
  })
end

return M
