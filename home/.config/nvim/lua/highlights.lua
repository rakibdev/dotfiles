local function apply()
  -- Statusline bg
  vim.api.nvim_set_hl(0, 'StatusLine',   { bg = 'NONE' })
  vim.api.nvim_set_hl(0, 'StatusLineNC', { bg = 'NONE' })

  -- Statusbar
  vim.api.nvim_set_hl(0, 'SLNormal',   { link = 'Title' })
  vim.api.nvim_set_hl(0, 'SLInsert',   { link = 'Added' })
  vim.api.nvim_set_hl(0, 'SLVisual',   { link = 'DiagnosticWarn' })
  vim.api.nvim_set_hl(0, 'SLReplace',  { link = 'DiagnosticError' })
  vim.api.nvim_set_hl(0, 'SLCommand',  { link = 'Statement' })
  vim.api.nvim_set_hl(0, 'SLTerminal', { link = 'Tag' })
  vim.api.nvim_set_hl(0, 'SLBranch',   { link = 'Normal' })
  vim.api.nvim_set_hl(0, 'SLFile',     { link = 'Normal' })
  vim.api.nvim_set_hl(0, 'SLModified', { link = 'Title' })
  vim.api.nvim_set_hl(0, 'SLError',    { link = 'DiagnosticError' })
  vim.api.nvim_set_hl(0, 'SLWarn',     { link = 'DiagnosticWarn' })

  -- Git panel
  vim.api.nvim_set_hl(0, 'GitPanelHeading',     { link = 'Title' })
  vim.api.nvim_set_hl(0, 'GitPanelAdd',         { link = 'Added' })
  vim.api.nvim_set_hl(0, 'GitPanelChange',      { link = 'Changed' })
  vim.api.nvim_set_hl(0, 'GitPanelDelete',      { link = 'Removed' })
  vim.api.nvim_set_hl(0, 'GitPanelDir',         { link = 'Comment' })
  vim.api.nvim_set_hl(0, 'GitPanelPlaceholder', { link = 'Comment' })

  -- Explorer
  vim.api.nvim_set_hl(0, 'Directory',                { link = 'Title' })
  vim.api.nvim_set_hl(0, 'SnacksPickerFile',         { link = 'Normal' })
  vim.api.nvim_set_hl(0, 'SnacksPickerDirectory',    { link = 'Normal' })
  vim.api.nvim_set_hl(0, 'SnacksPickerDir',          { link = 'Comment' })
  vim.api.nvim_set_hl(0, 'SnacksPickerPathHidden',   { link = 'Comment' })
  vim.api.nvim_set_hl(0, 'SnacksPickerPathIgnored',  { link = 'Comment' })
  vim.api.nvim_set_hl(0, 'SnacksPickerTotals',       { link = 'Normal' })

  -- Pairs
  vim.api.nvim_set_hl(0, 'BlinkPairsOrange',     { link = 'Constant' })
  vim.api.nvim_set_hl(0, 'BlinkPairsPurple',     { link = 'Keyword' })
  vim.api.nvim_set_hl(0, 'BlinkPairsBlue',       { link = 'Tag' })
  vim.api.nvim_set_hl(0, 'BlinkPairsUnmatched',  { link = 'Error' })
  vim.api.nvim_set_hl(0, 'BlinkPairsMatchParen', { link = 'MatchParen' })
end

apply()
vim.api.nvim_create_autocmd('ColorScheme', {
  group    = vim.api.nvim_create_augroup('AppHighlights', { clear = true }),
  callback = apply,
})
