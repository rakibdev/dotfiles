local M = {}

M.title  = ''
M.prompt = ' '

M.layout = {
  hidden = { 'preview' },
  layout = {
    box      = 'vertical',
    border   = true,
    backdrop = false,
    width    = 0.4,
    min_width = 0,
    height   = 0.4,
    { win = 'input', height = 1, border = 'bottom' },
    { win = 'list',  border = 'none' },
  },
}

M.win = {
  input = { keys = { ['<Esc>'] = { 'cancel', mode = { 'n', 'i' } } } },
}

return M
