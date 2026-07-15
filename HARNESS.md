# Claude Code 開発ハーネス

このリポジトリには、Claude Code で安全かつ一貫した品質で開発を進めるための
「ハーネス(レール)」が組み込まれている。このファイルはその全体像・連動の仕組み・
導入手順をまとめた入口ドキュメント。**初めて触る人はまずここを読むこと。**

## 何のためのものか

目的は 2 つ:

1. **開発ワークフローの統制** — Claude が守るべき規約・手順・権限を定義し、
   暴走や事故(本番 DB 消去、秘密情報の漏出、仕様無視の実装)を構造的に防ぐ
2. **検証ループの自動化** — Claude が書いたコードを自動で lint・型チェック・
   テストにかけ、失敗を Claude 自身にフィードバックして自己修正させる

## ファイル構成と役割

各ファイルの詳細な説明は、**そのファイル内のコメント**
(JSON ファイルは `.claude/README.md`)に書いてある。ここでは地図だけ示す。

```
CLAUDE.md                     規約・検証コマンド・docs参照ルール(毎セッション自動読込)
.mcp.json                     外部ツール接続(Neon/Vercel/Context7/Playwright)
                              ※JSONのため説明は .claude/README.md 参照
scripts/
└── verify.sh                 検証の単一入口(lint→型→テスト)。人間もClaudeもCIもこれを叩く
.claude/
├── README.md                 settings.json と .mcp.json の全設定の説明(JSONはコメント不可のため)
├── settings.json             権限(allow/deny)と hooks の紐付け。チーム共有・git管理
├── settings.local.json       (各自が作る)個人設定。git管理しない
├── hooks/
│   ├── post-edit.sh          編集のたびに自動lint+型チェック。失敗をClaudeに直接返す心臓部
│   └── notify.sh             完了・確認待ちを Windows トースト通知(WSL2 環境用)
├── skills/
│   ├── db-migration/         スキーマ変更の手順書(Claudeが必要時に自動で読む)
│   └── new-screen/           画面実装の手順書
├── agents/
│   ├── verifier.md           検証専門の子エージェント(修正権限なし)
│   └── code-reviewer.md      レビュー専門の子エージェント(修正権限なし)
└── commands/                  / で呼び出す定型プロンプト(下記一覧)
```

## スラッシュコマンド一覧

入力欄で `/` を打つと一覧が出る。詳細は各ファイルのコメント参照。

| コマンド | 用途 |
|---|---|
| `/implement-screen <画面名>` | docs/screens.md の仕様に従って画面を実装 |
| `/db-change <変更内容>` | 手順書に沿った DB スキーマ変更 |
| `/review` | 独立エージェントによるコードレビュー(must 解消まで) |
| `/fix-issue <issue番号>` | GitHub Issue を読んで修正・検証・報告 |
| `/new-issue <内容>` | 重複・再発チェック付きの Issue 起票 |
| `/commit` | verify 必須の定型コミット(push は人間が行う) |
| `/ui-check <画面名>` | Playwright で画面の実機確認 |

## 全体がどう連動するか(検証ループの流れ)

```
 あなた:「/implement-screen 経歴書一覧」
    │
    ▼
 CLAUDE.md(規約) + new-screen スキル(手順) を前提に Claude が実装
    │
    ▼ ファイルを編集するたびに…
 hooks/post-edit.sh が自動実行(lint + 型チェック)
    ├─ OK → 次の編集へ
    └─ NG → エラーが Claude に返り、その場で自己修正 ←━ ここが自動ループ
    │
    ▼ 実装が一段落したら…
 npm run verify(フル検証) → /review(独立レビュー) → /ui-check(実機確認)
    │
    ▼
 /commit(verify 必須の定型コミット)→ push は人間
```

役割分担の設計思想:

- **CLAUDE.md は「お願い」、hooks は「強制」** — 破られては困るルールは hooks と
  permissions(settings.json)に置く。CLAUDE.md の指示は長い会話で薄れることがある
- **検証する者・レビューする者は修正しない** — verifier / code-reviewer には
  編集権限を与えていない。「テストを書き換えて通す」型の事故を構造的に防ぐ
- **危険な操作はコマンド単位で塞ぐ** — prisma migrate reset、db push、git push、
  .env の読み取りは deny 済み

## 導入手順(新しい環境で最初にやること)

1. **jq のインストール**(post-edit.sh が依存): `brew install jq` (macOS) /
   `sudo apt-get install jq` (Ubuntu)
2. **実行権限の付与**: `chmod +x scripts/verify.sh .claude/hooks/post-edit.sh .claude/hooks/notify.sh`
3. **package.json に scripts を追加**(なければ):
   ```json
   {
     "scripts": {
       "lint": "eslint .",
       "verify": "bash scripts/verify.sh",
       "lint:fix": "eslint . --fix"
     }
   }
   ```
4. **.gitignore に追加**: `.claude/settings.local.json`
5. **動作確認**: `npm run verify` が通ることを確認する
6. **MCP の認証**: Claude Code 内で `/mcp` を実行し、neon / vercel / context7 の
   OAuth 認証を行う(初回のみ)。URL が古い場合は各公式ドキュメントで確認して
   `.mcp.json` を更新する
7. **hooks の反映確認**: Claude Code を起動し直すか `/hooks` で設定が
   読み込まれていることを確認する
8. **通知の動作確認**(Windows + WSL2 環境のみ): 以下を WSL のターミナルで実行し、
   Windows のトースト通知が出ることを確認する
   ```
   echo '{"hook_event_name":"Stop"}' | bash .claude/hooks/notify.sh
   ```
   出ない場合のチェックポイント:
   - Windows の「通知」設定で PowerShell からの通知が許可されているか
   - 「応答不可(集中モード)」がオンになっていないか
   - WSL から `powershell.exe` が実行できるか(`powershell.exe -c echo ok`)

### 通知(Stop / Notification フック)の運用メモ

- `Stop` は **Claude が応答を終えるたびに毎回**発火する。短いやり取りを
  続けているときは通知がうるさく感じるかもしれない。その場合は
  settings.json の `Stop` ブロックを削除し、`Notification`(確認待ち)だけ残す、
  という調整が手軽
- 通知が不要な人は、チーム共有の settings.json からは通知フックを外し、
  各自の `settings.local.json` に入れる運用に切り替えてもよい
  (hooks は settings.local.json でも定義できる)

## メンテナンス方針

- CLAUDE.md のディレクトリ構成・規約は、実装が進んで実態とズレたら更新する
  (ズレた CLAUDE.md は誤誘導の原因になる)
- 使っていない MCP サーバー・コマンド・スキルは削る。増やすより減らす方が難しいので、
  「実際に繰り返した作業」だけを定型化する
- permissions の allow は「運用して安全と確信できたもの」から徐々に広げる。
  最初から広げない
