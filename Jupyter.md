# Jupyter環境を整える

## 方針

- Jupyter Notebookとは([wiki](https://ja.wikipedia.org/wiki/Project_Jupyter)より)
  - Jupyter Notebook （旧IPython Notebooks）はJupyter Notebookドキュメントを作成・共有するためのウェブアプリケーションである。Jupyter Notebookドキュメントはプログラムコード、Markdownテキスト、数式、図式等を含むことができる。これにより数値計算アルゴリズムとシミュレーション結果、統計解析コードとその実行結果グラフ、機械学習モデルと推論出力など、様々なプログラムとその結果を再実行可能な1つのドキュメントとして表現できる．
- 中でもJupyter LabはJupyter Notebookを作成するためのウェブアプリケーション．
- ~~Jupyter Labはwebserverで動くのでクライアント側にはほとんど何もいらない．~~ 勘違いでした(2021/10/18追記)．
- 従って，Jupyterを動かすという目的のみならば，ミニマムな環境で問題ない．
- とはいえ，もしかしたら色々拡張したくなるかもしれないので，そこそこの拡張性を担保する．
- 以上を考慮し次を導入する
  - [Miniconda](https://docs.conda.io/en/latest/miniconda.html)
  - [Jupyter Lab](https://jupyter.org/install)

## 環境構築 for Mac

### Miniconda

- [Anaconda](https://anaconda.org)のコンパクト版．
- Anacondaとは？
  - そもそもPythonは，Pythonの基本的な機能のみではほとんど何もできず（四則演算くらい），モジュールを追加することで，色々な機能を付与することができる．Anacondaは，機械学習やディープラーニングができるくらいのモジュールが，あらかじめ入っているバンドル．
- Anacondaを入れてもいいが，そこそこサイズが大きいので，コンパクト版のMinicondaで十分．
- あとで色々やりたくなったら，自分で必要なモジュールを追加すればいい．

#### インストール

- [ここ](https://docs.conda.io/en/latest/miniconda.html)から，[Miniconda3 MacOSX 64-bit pkg](https://repo.anaconda.com/miniconda/Miniconda3-latest-MacOSX-x86_64.pkg)をダウンロード．
- 開いてインストールする[^1]．

#### 使い方

- AnacondaにはGUIアプリケーションもあるが，コマンドラインツールの方が圧倒的に使いやすい．
- パッケージの管理をするコマンドは`conda`．以下がよく使うコマンド．
- パッケージのアップデート

```sh
conda update --all
```

- パッケージのインストール
  - 必要なモジュールはこのコマンドでインストールする．
  - conda-forgeの[パッケージ一覧](https://conda-forge.org/feedstock-outputs/)

```sh
conda install [package]
```

- 情報を確認

```sh
conda info
```

#### プロキシ設定

- おそらくそのままだと，`update`コマンドなどは通らないので，プロキシ設定をする．
- ホームディレクトリの`.condarc`に次を追記．

```sh
proxy_servers:
  http: http://cmproxy2.nda.ac.jp:9090
  https: http://cmproxy2.nda.ac.jp:9090
ssl_verify: false
channels:
  - conda-forge
  - defaults
```

- もしくは，ターミナルで次を打っても一緒

```sh
conda config --set proxy_servers.http http://cmproxy2.nda.ac.jp:9090;conda config --set proxy_servers.https https://cmproxy2.nda.ac.jp:9090;conda config --set ssl_verify false;conda config --add channels conda-forge
```

この設定は，

```sh
conda config --show
```

もしくは，

```sh
conda config --show-source
```

で確認できる．

### Jupyter Lab

- [公式サイト](https://jupyter.org/install)，もしくは[installation guide](https://jupyterlab.readthedocs.io/en/stable/getting_started/installation.html)に沿ってやる．
- `conda`でインストール

```sh
conda install -c conda-forge jupyterlab
```

- Launch Jupyter Lab and enjoy it!

```sh
jupyter-lab
```

### VSCodeの設定(2021/10/18追記)

- **前提条件：ここまでの設定をしていること．VSCode導入済み**．[^2]
- Jupyter NotebookをVSCodeで使えるようにします．
- VSCodeでJupyterするメリット
  - Pythonを含め，様々な言語に対応していているので，TeXなども含めて全てこれで完結できる．
  - 拡張機能も豊富で，拡張性が高い(Theme,Keymapなど)．「こんな機能あったらいいのに」は大抵誰かが作っている．

#### 設定

- VSCodeを開き，拡張機能(⌘+⇧+X)から"**Jupyter Notebook Renderers**","**Jupyter Keymap**","**Python**"をインストールする[^3]．（いくつか同じような名前の拡張機能があるが，一番ダウンロード数が多いやつ）
- コマンドパネル(⌘+⇧+P)を開き，「基本設定：設定(JSON)を開く」を選択．次の設定を追加，保存する．

```json
"python.defaultInterpreterPath": "[pythonPath]",
"python.condaPath": "[condaPath]",
```

- ここで，[pythonPath]と[condaPath]はターミナルを使って，次のように調べる．

```sh
#[pythonPath]
echo $CONDA_PYTHON_EXE

#[condaPath]
echo $CONDA_EXE
```

- この環境変数は`conda info -s`でも調べられる．

#### VScodeでJupyter notebookを開く

- コマンドパネル(⌘+⇧+P)を開き，"Jupyter:Create New Jupyter Notebook"
- コマンドパネル(⌘+⇧+P)を開き，"Jupyter:Select Interpreter to start Jupyter server"から，先ほどの[pythonPath]と同じpythonを選択する．
- あとは，Jupyter-Labと同じように使える．
- VSCodeで作業する時はフォルダごと開いておくと作業しやすい．
  - 作業フォルダが`~/Document/work_jupyter`の場合，ターミナルで`code ~/Document/work_jupyter`と打つと，フォルダごと開いて作業できる．

#### インテリセンス

`vscode`+`python`のtabでインテリセンス（コード補完）はデフォルトの設定だとできない．
`settings.json`の`"python.autoComplete.extraPaths"`にパッケージのパスを追加する．
追加するパスは次のように調べる．

- ターミナルで，`python`などとしてインタラクティブモードに入り，適当なパッケージをインポートし，パスを表示させる（環境によって異なる）．

```python
>>>import sympy as sym
>>>sym.__file__
'opt/miniconda/lib/python3.8/site-packages/sympy/__init__.py'
```

- 上のパス(`site-packages/`まで)を参考に`settings.json`には次を追加する．

```json
 "python.autoComplete.extraPaths": [
    "opt/minoconda/lib/python3.8/site-packages"
  ],
  "python.analysis.extraPaths":[
    "opt/minoconda/lib/python3.8/site-packages"
  ]
```

## 環境構築 for Win

- MinicondaのインストールでMiniconda3 Windows 32-bit or 64-bitをインストールする以外は全部同じでできるはずですが，こちらに端末がないので，確認していないです．

## ref

- Jupyter Notebookを触る上で参考になりそうなサイトを書いておく．
  - グラフを書くモジュール：[Matplotlib](https://www.yutaka-note.com/archive/category/Matplotlib)
  - データを処理するモジュール：[Pandas](https://www.yutaka-note.com/archive/category/pandas)
  - [githubからファイルをダウンロードする](https://tetsufuku-blog.com/github-download/)

## VSCodeのお勧めの拡張機能

- theme

  - [Dracula Official](https://marketplace.visualstudio.com/items?itemName=dracula-theme.theme-dracula)
  - [Community Material Theme](https://marketplace.visualstudio.com/items?itemName=Equinusocio.vsc-community-material-theme)
  - [Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme)

- tools

  - [EvilInspector](https://marketplace.visualstudio.com/items?itemName=saikou9901.evilinspector)
  - [Bracket Select](https://marketplace.visualstudio.com/items?itemName=chunsen.bracket-select)

- productivity

  - [vscode-pets](https://marketplace.visualstudio.com/items?itemName=tonybaloney.vscode-pets)

[^1]: インストーラーを使った方法は，(個人的には)uncotrolableなので，`brew`などから導入することをお勧めする．しかし，手数がかかるため，ここではインストーラーを使って導入することにした．`brew`を導入済みの場合は，`brew install miniconda`で導入できる．
[^2]: `jupyter-lab`は必要ないが，`jupyter-lab`に付随して必要なモジュールをインストールしているので，別に無駄ではない．特に`jupyter`はおそらく必須．
[^3]: Pylanceなどは勝手にインストールされる．
