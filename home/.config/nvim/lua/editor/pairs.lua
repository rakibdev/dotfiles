return {
  'saghen/blink.pairs',
  dependencies = 'saghen/blink.lib',
  version = '*',
  build = function() require('blink.pairs').download():pwait(60000) end,
  event = 'InsertEnter',
  config = function(_, opts)
    require('blink.pairs').setup(opts)


  end,
  opts = {
    mappings = {
      -- typing '{' before 'word' results in '{word' not '{}word'
      pairs = {
        ['{'] = {
          {
            '{',
            '}',
            when = function(ctx)
              return not ctx:text_after_cursor(1):match('[%w_]')
            end,
          },
        },
        ['['] = {
          {
            '[',
            ']',
            when = function(ctx)
              return not ctx:text_after_cursor(1):match('[%w_]')
            end,
          },
        },
        ['('] = {
          {
            '(',
            ')',
            when = function(ctx)
              return not ctx:text_after_cursor(1):match('[%w_]')
            end,
          },
        },
      },
    },
  },
}
