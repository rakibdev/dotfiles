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

autoload -U compinit; compinit
local pluginsDir='/usr/share/zsh/plugins'
source $pluginsDir/fzf-tab-git/fzf-tab.plugin.zsh
source $pluginsDir/zsh-autosuggestions/zsh-autosuggestions.zsh
source $pluginsDir/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh

eval "$(fzf --zsh)"
export FZF_DEFAULT_COMMAND='fd --type f --hidden \
  --exclude .git \
  --exclude node_modules \
  --exclude dist \
  --exclude build \
  --exclude .cache \
  --exclude cache \
  --max-depth 3 \
  .'
export FZF_CTRL_T_COMMAND=$FZF_DEFAULT_COMMAND

alias -s {jpg,jpeg,png,gif,webp,md,json,js,ts}=xdg-open
alias poolkit=/usr/lib/xfce-polkit/xfce-polkit
alias ls='ls --color=auto'
# alias yarn=bun
alias npm=bun

export PATH="$HOME/.bun/bin:$HOME/.local/bin:$PATH"
