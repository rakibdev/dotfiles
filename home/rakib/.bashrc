# if not running interactively, don't do anything
[[ $- != *i* ]] && return

blue="\001\033[01;38;5;039m\002"
cyan="\001\033[01;38;5;051m\002"
reset="\001\e[0m\002"
PS1="$blue\u $cyan\w $reset "

# clean duplicate history. https://unix.stackexchange.com/a/419779
HISTFILESIZE=20
HISTCONTROL=ignoreboth:erasedups
shopt -s histappend
PROMPT_COMMAND="history -n; history -w; history -c; history -r"
tac "$HISTFILE" | awk '!x[$0]++' > /tmp/.bash_history  &&
                tac /tmp/.bash_history > "$HISTFILE"
rm /tmp/.bash_history

alias ls='ls --color=auto'
alias poolkit=/usr/lib/xfce-polkit/xfce-polkit
alias dots="GIT_DIR=$HOME/Downloads/dotfiles.git/ GIT_WORK_TREE=/ git"


# bun
export BUN_INSTALL="$HOME/.bun"
export PATH=$BUN_INSTALL/bin:$PATH