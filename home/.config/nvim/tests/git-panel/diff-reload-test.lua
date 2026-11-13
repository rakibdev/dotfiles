local child = MiniTest.new_child_neovim()
local equal = MiniTest.expect.equality

local T = MiniTest.new_set({
  hooks = {
    pre_case = function()
      child.restart({ '-u', vim.fn.getcwd() .. '/tests/minimal-init.lua' })
      child.lua([[
        local root = vim.fn.tempname()
        vim.fn.mkdir(root, 'p')
        local function git(...)
          vim.system({ 'git', '-c', 'user.name=t', '-c', 'user.email=t@t', ... }, { cwd = root }):wait()
        end
        _G.git = git
        _G.root = root
        git('init', '-q')
        vim.fn.writefile({ 'one' }, root .. '/a.txt')
        git('add', 'a.txt')
        git('commit', '-qm', 'init')
        _G.state = {
          gitRoot = root,
          diffAreaWin = vim.api.nvim_get_current_win(),
          explorerWin = vim.api.nvim_get_current_win(),
        }
      ]])
    end,
    post_case = function() child.stop() end,
  },
})

T['reload rebuilds when untracked file becomes modified'] = function()
  child.lua([[
    vim.fn.writefile({ 'one' }, root .. '/b.txt')
    state.selected = { entry = { path = 'b.txt', status = '??' }, group = 'unstaged' }
    require('git-panel.diff').open(state)
  ]])
  equal(child.lua_get('state.diffKind'), 'new')
  equal(child.lua_get('state.diffOrigBuf'), vim.NIL)

  child.lua([[
    git('add', 'b.txt')
    git('commit', '-qm', 'add b')
    vim.fn.writefile({ 'one', 'two' }, root .. '/b.txt')
    state.selected.entry = { path = 'b.txt', status = 'M' }
    require('git-panel.diff').reload(state)
  ]])
  equal(child.lua_get('state.diffKind'), 'modified')
  equal(child.lua_get('vim.api.nvim_buf_is_valid(state.diffOrigBuf)'), true)
  equal(child.lua_get('vim.api.nvim_buf_get_lines(state.diffOrigBuf, 0, -1, false)'), { 'one' })
end

T['reload keeps buffers when kind is unchanged'] = function()
  child.lua([[
    vim.fn.writefile({ 'one', 'two' }, root .. '/a.txt')
    state.selected = { entry = { path = 'a.txt', status = 'M' }, group = 'unstaged' }
    require('git-panel.diff').open(state)
    _G.origBuf = state.diffOrigBuf
    require('git-panel.diff').reload(state)
  ]])
  equal(child.lua_get('state.diffOrigBuf == origBuf'), true)
  equal(child.lua_get('state.diffKind'), 'modified')
end

return T
