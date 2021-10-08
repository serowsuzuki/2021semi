# Jupyter環境を整える

## 方針

- Jupyter Notebookとは([wiki](https://ja.wikipedia.org/wiki/Project_Jupyter)より)
  - Jupyter Notebook （旧IPython Notebooks）はJupyter Notebookドキュメントを作成・共有するためのウェブアプリケーションである[8]。Jupyter Notebookドキュメントはプログラムコード、Markdownテキスト、数式、図式等を含むことができる[9]。これにより数値計算アルゴリズムとシミュレーション結果、統計解析コードとその実行結果グラフ、機械学習モデルと推論出力など、様々なプログラムとその結果を再実行可能な1つのドキュメントとして表現できる．
- 中でもJupyter LabはJupyter Notebookを作成するためのウェブアプリケーション．
- Jupyter Labはwebserverで動くのクライアント側にはほとんど何もいらない．
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
  [^1]:インストーラーを使った方法は，(個人的には)uncotrolableなので，`brew`などから導入することをお勧めする．しかし，手数がかかるため，ここではインストーラーを使って導入することにした．

#### 使い方

- AnacondaにはGUIアプリケーションもあるが，コマンドラインツールの方が圧倒的に使いやすい．
- パッケージの管理をするコマンドは`conda`．以下がよく使うコマンド．
- パッケージのアップデート

```sh
conda update --all
```

- パッケージのインストール

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
~ -> conda config --set proxy_servers.http http://cmproxy2.nda.ac.jp:9090
~ -> conda config --set proxy_servers.https https://cmproxy2.nda.ac.jp:9090
~ -> conda config --set ssl_verify false
~ -> conda config --add channels conda-forge
```

この設定は，

```sh
~ -> conda config --show
```

もしくは，

```sh
~ -> conda config --show-source
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

## 環境構築 for Win

- MinicondaのインストールでMiniconda3 Windows 32-bit or 64-bitをインストールする以外は全部同じでできるはずですが，こちらに端末がないので，確認していないです．

## ref

- Jupyter Notebookを触る上で参考になりそうなサイトを書いておく．
  - グラフを書くモジュール：[Matplotlib](https://www.yutaka-note.com/archive/category/Matplotlib)
  - データを処理するモジュール：[Pandas](https://www.yutaka-note.com/archive/category/pandas)
