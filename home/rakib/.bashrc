# if not running interactively, don't do anything
[[ $- != *i* ]] && return

blue="\001\033[01;38;5;039m\002"
cyan="\001\033[01;38;5;051m\002"
reset="\001\e[0m\002"
PS1="$blue\u $cyan\w $reset "

alias ls='ls --color=auto'
alias poolkit=/usr/lib/xfce-polkit/xfce-polkit
alias dotfiles="GIT_DIR=$HOME/Downloads/dotfiles.git/ GIT_WORK_TREE=/ git"

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH=$BUN_INSTALL/bin:$PATH

# node
export NODE_BIN="$HOME/Downloads/node-pointer-compression/bin"
export PATH=$NODE_BIN:$PATH