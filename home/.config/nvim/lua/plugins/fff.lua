return {
  'dmtrKovalenko/fff.nvim',
  build = function() require("fff.download").download_or_build_binary() end,
  lazy = false,
  keys = {
    { "<C-p>", function() require('fff').find_files() end, desc = 'Find files' },
    { "ff", function() require('fff').live_grep({ grep = { modes = { 'fuzzy' } } }) end, desc = 'Live grep' },
  },
  config = function()
    require('fff').setup({
      prompt = ' ',
      preview = {
        enabled = false,
      },
      layout = {
        prompt_position = 'top',
        width = 0.6,
      },
      grep = {
        location_format = '%d',
      },
    })


    require('fff.highlights').should_show_git_border = function() return false end

    -- removes left gap of search result caused by signcolumn
    vim.api.nvim_create_autocmd('FileType', {
      pattern = 'fff_list',
      callback = function()
        local win = vim.api.nvim_get_current_win()
        vim.schedule(function()
          if vim.api.nvim_win_is_valid(win) then
            vim.api.nvim_set_option_value('signcolumn', 'no', { win = win })
          end
        end)
      end,
    })

    local pendingQuery = ''

    -- sniff query before picker_ui.select clears state (grep_query is never forwarded to jump_to_location)
    local ui = require('fff.picker_ui.picker_ui')
    local origSelect = ui.select
    ui.select = function(action)
      if ui.state.mode == 'grep' then pendingQuery = ui.state.query or '' end
      origSelect(action)
      -- origSelect opens the file via its own vim.schedule; ours runs after (FIFO)
      vim.schedule(function()
        local gpState = require('git-panel')._state
        if not (gpState and gpState.tab and vim.api.nvim_tabpage_is_valid(gpState.tab)) then return end
        local filePath = vim.fn.expand('%:p')
        local repos = require('utils.git').repoList()
        local fileRepo
        for _, root in ipairs(repos) do
          if filePath:sub(1, #root + 1) == root .. '/' then
            if not fileRepo or #root > #fileRepo then fileRepo = root end
          end
        end
        if not fileRepo then return end
        local explorer = require('git-panel.explorer')
        if fileRepo ~= gpState.gitRoot then
          explorer.switchRepo(gpState, fileRepo)
          gpState.preselect = filePath
          explorer.refresh(gpState)
        else
          explorer.selectFile(gpState, filePath)
        end
      end)
    end

    local ns = vim.api.nvim_create_namespace('fff_jump_hl')

    local loc = require('fff.location_utils')
    local origJump = loc.jump_to_location
    loc.jump_to_location = function(location)
      origJump(location)

      if pendingQuery == '' then return end
      local query = pendingQuery
      pendingQuery = ''
      vim.schedule(function()
        local bufnr   = vim.api.nvim_get_current_buf()
        local line    = vim.api.nvim_win_get_cursor(0)[1]
        local content = vim.api.nvim_buf_get_lines(bufnr, line - 1, line, false)[1] or ''
        local col     = content:lower():find(query:lower(), 1, true)
        if not col then return end
        vim.api.nvim_buf_set_extmark(bufnr, ns, line - 1, col - 1, {
          end_col  = math.min(col - 1 + #query, #content),
          hl_group = 'Search',
          priority = 1000,
        })
        -- defer: explorer steals then returns focus on open, firing CursorMoved immediately and wiping the highlight before it's seen
        vim.defer_fn(function()
          vim.api.nvim_create_autocmd('CursorMoved', {
            buffer = bufnr, once = true,
            callback = function() vim.api.nvim_buf_clear_namespace(bufnr, ns, 0, -1) end,
          })
        end, 100)
      end)
    end
  end,
}
