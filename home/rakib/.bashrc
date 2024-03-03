# if not running interactively, don't do anything
[[ $- != *i* ]] && return

red="\033[1;31m"
blue="\033[1;34m"
blueGray="\033[0;94m"
colorOff="\033[0m"

PS1="\$(if [ \$? == 0 ]; then echo -e '$blue●'; else echo -e '$red●'; fi) "
PS1+="$blueGray\w $colorOff "

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