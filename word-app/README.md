# 英単語学習アプリ

要件定義書「英単語学習アプリ 要件定義書」に基づく実装。英単語を登録し、間隔反復(SM-2簡略版)で復習するための個人用Webアプリ(PWA)です。

- 単語登録:英単語を入力するとAI(Anthropic Messages API)が固定フォーマットで情報を生成し、確認してから保存
- 一覧・詳細・編集・削除
- 復習:自己採点式クイズ + 間隔反復による次回復習日の自動計算
- 学習履歴・統計、エクスポート(JSON / CSV / Anki形式)

## 構成

```
word-app/
├── server/                 バックエンド (Node.js + Express + SQLite)
│   ├── src/
│   │   ├── db/             接続とスキーマ (schema.sql = 要件定義書 7.2)
│   │   ├── lib/            日付・SRSアルゴリズム・バリデーション
│   │   ├── repositories/   単語の永続化と復習記録
│   │   ├── routes/         REST API
│   │   ├── services/       Anthropic API連携・エクスポート
│   │   ├── app.js          Expressアプリ
│   │   └── server.js       起動エントリ
│   └── test/               node:test によるテスト
└── web/                    フロントエンド (React + Vite)
    ├── public/             PWA manifest / icon / service worker
    └── src/
        ├── screens/        一覧・追加・詳細(編集)・復習
        ├── components/     共通UI(表示ビュー・構造化フォーム等)
        └── api.js          APIクライアント
```

技術選定:

| 項目 | 採用 | 補足 |
|---|---|---|
| フロントエンド | React 19 + Vite | プロトタイプのコンポーネント構成をそのまま移植可能 |
| バックエンド | Node.js 22 + Express 5 | APIキーをサーバー側に閉じ込めるため |
| DB | SQLite(`node:sqlite`) | ネイティブビルド不要。方言依存を避け、PostgreSQLへ移行しやすいDDLにしてある |
| AI連携 | Anthropic Messages API(`claude-opus-5`) | Structured Outputs でJSON構造を保証 |

## セットアップ

前提: **Node.js 22.5 以上**(`node:sqlite` を使用)。

```bash
cd word-app
npm install
cp .env.example .env    # ANTHROPIC_API_KEY を設定
```

`.env` の主な項目(すべて任意、APIキーのみ自動生成に必須):

| 変数 | 既定値 | 説明 |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | 単語情報の自動生成に使用。未設定でも手入力での登録・復習は利用可能 |
| `ANTHROPIC_MODEL` | `claude-opus-5` | 生成に使うモデル |
| `ANTHROPIC_EFFORT` | `medium` | 生成時のeffort(`low`〜`max`) |
| `PORT` | `3001` | APIサーバーのポート |
| `DB_PATH` | `server/data/words.db` | SQLiteファイルの場所 |
| `TZ` | OS設定 | 復習日の基準タイムゾーン。日本で使うなら `Asia/Tokyo` |

## 起動

開発時(APIサーバー + Vite開発サーバー):

```bash
npm run dev
# → http://localhost:5173 (APIは http://localhost:3001 へプロキシ)
```

本番相当(フロントをビルドし、APIサーバーから同一オリジンで配信):

```bash
npm run build
npm start
# → http://localhost:3001
```

同一オリジン配信時はPWAとしてホーム画面に追加できます。

テスト:

```bash
npm test    # 間隔反復アルゴリズム + API統合テスト
```

## 使い方

1. 一覧画面の右下 **+** から単語を追加。英単語を入力して「AIで単語情報を生成」→ 内容を確認して「登録する」。
   - APIキーがない場合や自分で書きたい場合は「AIを使わず手入力で登録する」。
2. 一覧のカードをタップで詳細画面。右上「編集」で各項目を修正、「保存」で確定・「キャンセル」で破棄。
3. 一覧の「復習する」で、次回復習日が本日以前の単語をクイズ形式で出題。
   - 単語と発音を見る → 「意味を確認する」→ 意味・例文を表示 → 「分かった / わからなかった」を自己申告。
   - 復習対象が0件のときは「全単語で復習する」を選べます。
   - 「わからなかった」単語は、そのセッション内で末尾にもう一度だけ出題されます(当日中に再度復習対象になるため)。
4. 一覧右上の **⬇** から JSON / CSV / Anki形式でエクスポート(表示中の絞り込みが対象)。

## 間隔反復アルゴリズム(要件 4.3.1)

`server/src/lib/srs.js` に実装。単語ごとに `ease_factor`(初期2.5)と `interval_days`(初期0)を保持します。

- **正答**:`interval_days` が0なら1、それ以外は `interval_days × ease_factor` を四捨五入。`ease_factor` は +0.05(上限2.8)。次回復習日 = 本日 + 更新後の `interval_days`
- **誤答**:`interval_days` を0にリセット。`ease_factor` は -0.2(下限1.3)。次回復習日 = 本日
- `interval_days` が21以上で `mastered`、それ以外は `learning`(未復習は `new`)

## API

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/api/health` | 稼働確認・AI設定状況 |
| POST | `/api/words/generate` | 英単語から単語情報を生成(保存はしない) |
| GET | `/api/words` | 一覧。`?due=true` `?status=` `?q=` で絞り込み |
| POST | `/api/words` | 登録 |
| GET | `/api/words/:id` | 詳細(復習履歴を含む) |
| PUT | `/api/words/:id` | 更新(意味・例文などは全置換) |
| DELETE | `/api/words/:id` | 削除(関連レコードもカスケード削除) |
| POST | `/api/words/:id/reviews` | 復習結果の記録 (`{"result":"correct"\|"incorrect"}`) |
| GET | `/api/words/review/queue` | 復習キュー。`?include_all=true` で対象0件時に全単語を返す |
| GET | `/api/words/stats` | 全体統計 |
| GET | `/api/words/export` | `?format=json\|csv\|anki` `&status=` |

## 単語情報の自動生成(要件 4.1.1)

`server/src/services/generate.js` にプロンプトと出力スキーマを定義しています。

- ユーザープロファイル(TOEIC 700±50 / 元自衛官・防衛装備R&D / 安全保障・物理・ガジェット・アウトドア)をシステムプロンプトに明示
- 出力フォーマットは固定6項目(発音・コアイメージ・意味・派生語・例文・使い分け)
- Structured Outputs(`output_config.format`)でJSONスキーマを強制し、前置きやコードフェンスが混ざらないようにしている
- 件数上限(意味・派生語・使い分け 各2件、例文 2件)と文字数目安をプロンプトで明示し、**さらにサーバー側でも件数を切り詰めて**出力の長大化と途中切れによる解析エラーを防ぐ
- 認証エラー・レート制限・応答切れ(`max_tokens`)・拒否(`refusal`)はそれぞれ日本語のメッセージに変換してフロントへ返す

## データベース

要件定義書 7.2 のテーブル定義をそのまま実装しています(`server/src/db/schema.sql`)。

```
users (将来)
  └─< words
        ├─< meanings
        ├─< derivatives
        ├─< example_sentences
        ├─< usage_distinctions
        └─< review_history
```

将来の同期機能(要件 4.6 / フェーズ4)に備えた設計:

- `users` テーブルを先に定義し、`words.user_id` を **NULL許容の外部キーとして用意済み**。認証を追加したら既存行に `user_id` を埋めるだけで多ユーザー化できる
- 見出し語の重複防止ユニークインデックスも `COALESCE(user_id,'')` 込みで、ユーザー単位の一意制約にそのまま移行できる
- SQLite固有の型・関数を使わないDDLにしてあるため、PostgreSQLへは型名の読み替え(TEXT→UUID/TIMESTAMPTZ 等)で移行可能

## 実装上の判断メモ

要件定義書に明記がなく、実装時に判断した点:

- **重複登録**:同じ見出し語(大文字小文字を区別しない)は登録できず、409エラーとして「既に登録されています」を表示する
- **登録直後の扱い**:`next_review_date` を登録日に設定し、その日のうちに1回目の復習対象になるようにした
- **編集時のSRS**:単語情報を編集しても `ease_factor` / `interval_days` / 次回復習日はリセットしない
- **手入力での登録**:要件の主経路はAI生成だが、APIキー未設定でも動作するよう手入力の登録経路を用意した
- **誤答時の再出題**:セッション内でキュー末尾に1回だけ戻す(無限ループを避けるため上限1回)
- **保存の確認**:保存・更新・削除の成否は必ずトーストで表示し、失敗時も入力内容は破棄しない(非機能要件のデータ永続化に対応)

## 未実装(要件定義書のスコープ外・将来フェーズ)

- 通知・リマインド(要件 4.5:対象外)
- クラウド同期・アカウント機能(要件 4.6 / フェーズ4:上記の設計で受け入れ準備のみ)
- オフライン利用(Service Workerはインストール可能にするための最小構成のみで、キャッシュは行わない)
- Anki `.apkg` 形式(タブ区切りのAnki import形式で代替)
