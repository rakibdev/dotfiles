local M = {}

M.extensions = {
	'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'pdf', 'zip', 'zst', 'gz', 'xz',
	'tar', '7z', 'exe', 'so', 'bin', 'mp3', 'mp4', 'ttf', 'woff', 'woff2',
}

local lookup = vim.iter(M.extensions):fold({}, function(set, ext)
	set[ext] = true
	return set
end)

function M.isBinary(path)
	local ext = path:match('%.([^./]+)$')
	return ext ~= nil and lookup[ext:lower()] == true
end

function M.placeholder(path)
	local stat = vim.uv.fs_stat(path)
	if not stat then
		return { 'Binary file (deleted)' }
	end
	local size = stat.size
	local text = size < 1024 and size .. ' B' or size < 1024 ^ 2 and ('%.1f KB'):format(size / 1024) or ('%.1f MB'):format(size / 1024 ^ 2)
	return { 'Binary file (' .. text .. ')' }
end

-- binary files never load from disk: buffer shows a one-line placeholder
function M.setup()
	vim.api.nvim_create_autocmd('BufReadCmd', {
		group = vim.api.nvim_create_augroup('BinaryPlaceholder', { clear = true }),
		pattern = vim.tbl_map(function(ext)
			return '*.' .. ext
		end, M.extensions),
		callback = function(args)
			vim.bo[args.buf].modifiable = true
			vim.api.nvim_buf_set_lines(args.buf, 0, -1, false, M.placeholder(vim.fn.fnamemodify(args.file, ':p')))
			vim.bo[args.buf].modifiable = false
			vim.bo[args.buf].readonly = true
			vim.bo[args.buf].modified = false
		end,
	})
end

return M
