setopt PROMPT_SUBST
PROMPT='$([ $? -eq 0 ] && echo "%F{blue}●" || echo "%F{red}●") %F{cyan}%~${reset_color} '

# Ctrl + arrow
bindkey "^[[1;5C" forward-word
bindkey "^[[1;5D" backward-word
### Ctrl + backspace
bindkey '^H' backward-kill-word

# Aliases
alias ls='ls --color=auto'
alias poolkit=/usr/lib/xfce-polkit/xfce-polkit
alias dots="GIT_DIR=$HOME/Downloads/dotfiles.git/ GIT_WORK_TREE=/ git"
alias yarn=bun

# Path
export PATH="$HOME/.bun/bin:$PATH"

HISTFILE=~/.cache/.zsh_history
HISTSIZE=50
SAVEHIST=10
setopt INC_APPEND_HISTORY
setopt HIST_IGNORE_ALL_DUPS
setopt HIST_IGNORE_SPACE

eval "$(zoxide init zsh)"
source /usr/share/zsh/plugins/zsh-autosuggestions/zsh-autosuggestions.zsh
source /usr/share/zsh/plugins/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh