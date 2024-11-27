setopt PROMPT_SUBST
PROMPT='$([ $? -eq 0 ] && echo "%F{blue}●" || echo "%F{red}●") %F{cyan}%~${reset_color} '

# Ctrl + arrow
bindkey "^[[1;5C" forward-word
bindkey "^[[1;5D" backward-word
# Ctrl + backspace
bindkey '^H' backward-kill-word

HISTFILE=~/.cache/.zsh_history
HISTSIZE=100
SAVEHIST=20
setopt INC_APPEND_HISTORY
setopt HIST_IGNORE_ALL_DUPS
setopt HIST_IGNORE_SPACE

setopt CORRECT_ALL

source /usr/share/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh
source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
eval "$(zoxide init zsh)"
eval "$(fzf --zsh)"
# source /usr/share/zsh/plugins/fzf-tab-source/fzf-tab.plugin.zsh

alias dots="GIT_DIR=$HOME/Downloads/dotfiles.git/ GIT_WORK_TREE=/ git"
alias poolkit=/usr/lib/xfce-polkit/xfce-polkit
alias ls='ls --color=auto'
alias cd=z
alias yarn=bun

export PATH="$HOME/.bun/bin:$PATH"