# If not running interactively, don't do anything.
[[ $- != *i* ]] && return

# Wrap colors in \[...\] to not mess up the prompt when pasting or using arrow keys.
red="\[\e[1;31m\]"
blue="\[\e[1;34m\]"
lightBlue="\[\e[0;94m\]"
colorOff="\[\e[0m\]"

PS1="\$(if [ \$? == 0 ]; then echo -e '$blue●'; else echo -e '$red●'; fi) "
PS1+="$lightBlue\w $colorOff "

# Clean duplicate history. https://unix.stackexchange.com/a/419779
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