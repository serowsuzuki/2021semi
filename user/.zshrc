# compinitはよく分かっていない．
# The following lines were added by compinstall
zstyle :compinstall filename '/Users/ksuzuki/.zshrc'

autoload -Uz compinit
compinit

# 補完関数の表示を強化する
zstyle ':completion:*' verbose yes
zstyle ':completion:*' completer _expand _complete _match _prefix _approximate _list _history
zstyle ':completion:*:messages' format '%F{YELLOW}%d'$DEFAULT
zstyle ':completion:*:warnings' format '%F{RED}No matches for:''%F{YELLOW} %d'$DEFAULT
zstyle ':completion:*:descriptions' format '%F{YELLOW}completing %B%d%b'$DEFAULT
zstyle ':completion:*:options' description 'yes'
zstyle ':completion:*:descriptions' format '%F{yellow}Completing %B%d%b%f'$DEFAULT
# マッチ種別を別々に表示
zstyle ':completion:*' group-name ''


# 補完候補を一覧表示にする
setopt auto_list
# TAB で順に補完候補を切り替える
setopt auto_menu
# 候補をカーソルでセレクト
zstyle ':completion:*:default' menu select=2
# 保管候補を色付け
export LS_COLORS='di=34:ln=35:so=32:pi=33:ex=31:bd=46;34:cd=43;34:su=41;30:sg=46;30:tw=42;30:ow=43;30'
zstyle ':completion:*:default' list-colors ${(s.:.)LS_COLORS}
## 大文字と小文字を区別しない
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Z}'
# cdいらない
setopt auto_cd
# 語の途中でもカーソル位置で補完
setopt complete_in_word
# カーソル位置は保持したままファイル名一覧を順次その場で表示
setopt always_last_prompt
#日本語ファイル名等8ビットを通す
setopt print_eight_bit
# 拡張グロブで補完(~とか^とか。例えばless *.txt~memo.txt ならmemo.txt 以外の *.txt にマッチ)
setopt extended_glob
# 明確なドットの指定なしで.から始まるファイルをマッチ
setopt globdots
# End of lines added by compinstall

# added path
export PATH="/usr/local/sbin:$PATH"
# brew管理のgitのパスを通す．（systemのgitが優先されるの防ぐ）
export PATH="/usr/local/opt/git/bin:$PATH"

# proxy setting
export http_proxy="http://cmproxy2.nda.ac.jp:9090"
export https_proxy="http://cmproxy2.nda.ac.jp:9090"
export all_proxy="http://cmproxy2.nda.ac.jp:9090"
export HTTP_PROXY="http://cmproxy2.nda.ac.jp:9090"
export HTTPS_PROXY="http://cmproxy2.nda.ac.jp:9090"
export ALL_PROXY="http://cmproxy2.nda.ac.jp:9090"

# zplug
export ZPLUG_HOME=/usr/local/opt/zplug
source $ZPLUG_HOME/init.zsh
# 自分自身をプラグインとして管理
zplug 'zplug/zplug', hook-build:'zplug --self-manage'
# 非同期処理できるようになる
zplug "dracula/zsh", as:theme
# テーマ(ここは好みで。調べた感じpureが人気)
# zplug "mafredri/zsh-async"
# zplug "sindresorhus/pure"
zplug "yous/lime"
# 構文のハイライト(https://github.com/zsh-users/zsh-syntax-highlighting)
zplug "zsh-users/zsh-syntax-highlighting", defer:2
# コマンド入力途中で上下キー押したときの過去履歴がいい感じに出るようになる
zplug "zsh-users/zsh-history-substring-search", defer:3
# 過去に入力したコマンドの履歴が灰色のサジェストで出る
zplug "zsh-users/zsh-autosuggestions"
# 補完強化
zplug "zsh-users/zsh-completions"
# git の補完を効かせる
# 補完＆エイリアスが追加される
zplug "plugins/git",   from:oh-my-zsh
zplug "peterhurford/git-aliases.zsh"
# 256色表示にする
## zplug "chrissicool/zsh-256color"
# コマンドライン上の文字リテラルの絵文字を emoji 化する
##zplug "mrowa44/emojify", as:command
# Install plugins if there are plugins that have not been installed
if ! zplug check --verbose; then
  printf "Install? [y/N]: "
  if read -q; then
    echo; zplug install
  fi
fi

# コマンドの履歴機能
# 履歴ファイルの保存先
HISTFILE=$HOME/.zsh_history
# メモリに保存される履歴の件数
HISTSIZE=10000
# HISTFILE で指定したファイルに保存される履歴の件数
SAVEHIST=10000
# Then, source plugins and add commands to $PATH
zplug load #--verboseをコメントアウト
# zplug load --verbose

# Example aliases
# alias zshconfig="mate ~/.zshrc"
# alias ohmyzsh="mate ~/.oh-my-zsh"
alias g='git'
alias gs='git status'
alias gb='git branch'
alias gc='git checkout'
alias gct='git commit'
alias gg='git grep'
alias ga='git add'
alias gd='git diff'
alias gl='git log'
alias gcma='git checkout master'
alias gfu='git fetch upstream'
alias gfo='git fetch origin'
alias gmod='git merge origin/develop'
alias gmud='git merge upstream/develop'
alias gmom='git merge origin/master'
alias gcm='git commit -m'
alias gpo='git push origin'
alias gpom='git push origin master'
alias gst='git stash'
alias gsl='git stash list'
alias gsu='git stash -u'
alias gsp='git stash pop'
alias so='source'

# function
# qrcodeの生成:qr hoge
function qr(){
  qrencode -o qrcode_temp.png $@ | open -a preview qrcode_temp.png
}
# brewのauto-updateをしない
# これ機能している？（2021/01/05）
HOMEBREW_NO_AUTO_UPDATE=1

# pyenvさんに~/.pyenvではなく、/usr/loca/var/pyenvを使うようにお願いする
export PYENV_ROOT=/usr/local/var/pyenv
# 同じところにpathを通す
export PATH="$PYENV_ROOT/bin:$PATH"
# pyenvさんに自動補完機能を提供してもらう
if command -v pyenv 1>/dev/null 2>&1; then
  eval "$(pyenv init --path)"
  # 2021/06/07:"$(pyenv init -)" -> "$(pyenv init --path)"
fi

# brew doctorしたときにconfigがconflictしてるよって警告を消せる．
alias brew="env PATH=${PATH/usr\/local\/var\/pyenv\/shims:/} brew"


# condaの設定
. /usr/local/var/pyenv/versions/anaconda3-2021.05/etc/profile.d/conda.sh

