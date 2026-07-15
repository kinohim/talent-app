# .claude/ ディレクトリの説明

> **注意**: `settings.json` は仕様上コメントを書けない(厳密な JSON のみ有効)ため、
> 各設定の意味と必要性はこのファイルに記載する。

## settings.json — permissions.allow

「Claude に確認なしで自走してほしい範囲」の定義そのもの。
これがないと検証のたびに「実行していいですか?」の確認が入り、自動ループが止まる。

| 設定 | 必要性 |
|---|---|
| `Bash(npm run lint:*)` | lint と `lint -- --fix` 等の派生を許可。`:*` は prefix 一致の記法 |
| `Bash(npm run verify)` | 検証の単一入口。タスク完了時にフル検証を自走させる |
| `Bash(npx tsc:*)` | 型チェックの単体実行を許可 |
| `Bash(npx vitest run:*)` | テストの1回実行(watch なし)を許可 |
| `Bash(npx prisma generate)` | Prisma Client の再生成。schema 変更のたびに必要になる |
| `Bash(npx prisma migrate dev:*)` | 開発用マイグレーションの作成・適用。非破壊なので許可 |
| `Bash(bash scripts/verify.sh)` | `npm run verify` を経由しない直接実行も許可 |
| `Bash(git status)` `Bash(git diff:*)` `Bash(git log:*)` | 読み取り専用の git 操作。/review や /commit が変更内容を確認するたびに確認ダイアログで止まらないようにする |
| `Bash(git add:*)` `Bash(git commit:*)` | ローカルへのコミットは許可(/commit を自走させるため)。**リモートに影響する push は deny のまま**、という「ローカルは自由・外部は確認」の線引き |
| `Bash(gh issue view:*)` `Bash(gh issue list:*)` | GitHub の読み取り専用操作。/fix-issue・/new-issue の調査フェーズを自走させる。**書き込み系(`gh issue create` / `gh issue comment`)は意図的に allow していない** → 実行前に必ず確認が入る(外部に見える操作のため) |

## settings.json — permissions.deny

| 設定 | 必要性 |
|---|---|
| `Read(./.env)` `Read(./.env.*)` | Neon の接続文字列、Auth.js の `AUTH_SECRET`、SSO のクライアントシークレットが集中するファイル。読ませない = 会話ログや出力への漏出を防ぐ |
| `Bash(npx prisma migrate reset:*)` | DB 全消去の破壊的操作。業務データを扱うアプリの事故防止として明示的に塞ぐ |
| `Bash(npx prisma db push:*)` | マイグレーション履歴を経ずスキーマを直接変更する操作。履歴の一貫性を守るため塞ぐ |
| `Bash(git push:*)` | リモートへの反映は人間の承認を挟むための安全弁。緩めたくなったら外せばよい |

トレードオフの注記: `Read(./.env.*)` は **`.env.example` のような無害なファイルも
塞いでしまう**。`.env.example`(秘密情報を含まないテンプレート)を運用する場合は、
ワイルドカードをやめて `Read(./.env.local)` 等の実ファイル名の列挙に切り替えること。
安全側に倒してワイルドカードを初期値にしている。

補足: `rm -rf` のような汎用コマンドの deny は、書き方の変形(`rm -r -f` 等)で
素通りするため過信できない。「deny があるから安全」という誤った安心感を生むより、
破壊的操作は具体的なコマンド単位(prisma reset 等)で塞ぐ方針。

## settings.json — hooks

| 設定 | 必要性 |
|---|---|
| `matcher: "Edit\|MultiEdit\|Write"` | ファイルの編集・複数箇所一括編集・新規作成の直後にだけ発火させる(Read 等では発火させない) |
| `command: bash .claude/hooks/post-edit.sh` | ロジックを settings.json に直書きせずスクリプトに分離。変更時に JSON を触らずに済み、シェル単体でテストもできる |
| `Stop` → notify.sh | Claude が**応答を完了した**ときに Windows トースト通知を出す(WSL2 環境用)。matcher は不要なイベントなので指定しない |
| `Notification` → notify.sh | Claude が**許可や入力を待っている**ときに通知を出す。放置に気づけるようにする |

通知の仕組み・注意点(WSL2 前提、うるさい場合の外し方など)は
`hooks/notify.sh` 内のコメントと `HARNESS.md` の導入手順を参照。

hook の中身と終了コードの意味は `hooks/post-edit.sh` 内のコメントを参照。

## .mcp.json (リポジトリ直下) — 外部ツール接続

> `.mcp.json` も厳密な JSON のためコメント不可。説明はここに記載する。
> このファイルは git 管理してチーム共有する。初回利用時に各サーバーの
> 認証(OAuth)を求められる。`/mcp` コマンドで接続状態の確認・認証ができる。

| サーバー | 用途 | 必要性・注意 |
|---|---|---|
| neon | SQL 実行、DB ブランチ操作 | 検証用に DB ブランチを切ってマイグレーションを安全に試せる。**本番ブランチへの破壊的操作は許可しない運用にする**(下記 permissions 参照) |
| vercel | デプロイ状況・ビルドログ取得 | 「デプロイ失敗 → ログを読ませて修正」のループ用 |
| context7 | ライブラリ最新ドキュメント取得 | Next.js 16 / Tailwind v4 / Auth.js v5 beta / Prisma 7 と新しいバージョン揃いのため、Claude の学習データの古さを補う |
| playwright | ブラウザ操作・スクリーンショット | lint/型/テストで拾えない「画面が実際に動くか」の検証。22 画面の PWA では価値が大きい |

運用メモ:

- GitHub は MCP ではなく `gh` CLI で運用する(コンテキスト消費が軽いため)。
  Issue 駆動のワークフローが必要になったら公式 GitHub MCP の追加を検討する
- MCP サーバーはツール定義だけで常時コンテキストを消費する。
  使っていないサーバーは削る、をメンテナンス方針とする
- URL は導入時に各公式ドキュメントで最新を確認すること
  (Neon: neon.tech / Vercel: vercel.com/docs / Context7: context7.com)

### MCP ツールの permissions (settings.json)

MCP のツールは permissions で次の 2 段階の粒度で指定できる:

- `mcp__<サーバー名>` — そのサーバーの**全ツール**を対象にする
- `mcp__<サーバー名>__<ツール名>` — 特定のツールだけを対象にする

(注意: `mcp__server__*` のようなワイルドカード形式は使えない。
全ツール許可はサーバー名までの指定で行う)

方針: **読み取り系は allow、破壊系は ask のまま(未指定)にする。**
settings.json には以下を設定済み:

- allow: `mcp__context7`(ドキュメント取得は無害)、`mcp__playwright`(ローカルブラウザ操作)
- neon / vercel は意図的に allow していない → 実行のたびに確認が入る。
  運用してみて安全と確信できた読み取り系ツールから
  `mcp__neon__<ツール名>` の粒度で個別に allow に足していく


## このディレクトリの運用ルール

- `settings.json` はチーム共有前提で **git 管理する**
- 個人の好みの設定(追加の allow 等)は `settings.local.json` に分離し、
  `.gitignore` に追加する
