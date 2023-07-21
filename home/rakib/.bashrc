# if not running interactively, don't do anything
[[ $- != *i* ]] && return

blue="\e[1;34m"
green="\e[1;32m"
reset="\[\e[0m\]"
PS1="$blue\u $green\w$reset "

alias ls='ls --color=auto'
alias dotfiles="GIT_DIR=$HOME/Downloads/dotfiles.git/ GIT_WORK_TREE=/ code-insiders /"

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH=$BUN_INSTALL/bin:$PATH

# node
export NODE_BIN="$HOME/Downloads/node-pointer-compression/bin"
export PATH=$NODE_BIN:$PATH