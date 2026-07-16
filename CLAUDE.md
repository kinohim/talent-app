# CLAUDE.md

業務経歴書 Web アプリ(PWA)。Next.js App Router + Prisma + Neon + Auth.js 構成。

<!--
このファイルの役割:
セッション開始時に Claude へ自動で読み込まれる「プロジェクトの前提知識」。
ここに書くのは「お願いベース」の指示であり、強制力は hooks より弱い。
破られては困るルールは .claude/settings.json (permissions/hooks) 側に置く。
肥大化してきたら @docs/xxx.md 形式の import で分割する。
-->

## 技術スタック

- Next.js 16 (App Router) / React 19 / TypeScript 5
- 認証: Auth.js (next-auth v5) + @auth/prisma-adapter (SSO 対応)
- DB/ORM: Prisma 7 + Neon PostgreSQL (@prisma/adapter-neon)
- スタイル: Tailwind CSS v4
- テスト: Vitest / Lint: ESLint 9 (eslint-config-next)
- パッケージマネージャ: npm

## プロジェクトドキュメント

<!--
@ 付きは毎セッション自動で全文読み込みされる import。
コンテキスト節約のため、常時必要な「全体像」だけを import し、
詳細仕様はパス参照に留めて、必要なタスクのときだけ読みに行かせる。
-->

@docs/README.md

以下は必要になったタスクの開始時に読むこと(常時読み込みはしない):

- `docs/schema.md` — DB スキーマ全 16 テーブルの定義。**スキーマや Prisma モデルに
  触れる変更の前には必ず読むこと**
- `docs/screens.md` — 全 22 画面の仕様。画面の新規実装・修正の前に該当画面の節を読むこと
- `docs/er-diagram.md` — ER 図 (Mermaid)。テーブル間のリレーションを確認したいとき
- `docs/screen-flow.md` — 画面遷移図 (Mermaid)。導線に関わる変更のとき
- `docs/decisions.md` — 設計判断の経緯。**既存の設計に疑問を持ったり変更を提案する前に、
  まずここに理由が書かれていないか確認すること**

仕様と実装が食い違っている場合は、勝手にどちらかに合わせず、どちらが正か人間に確認する。

## 検証(最重要)

<!-- 検証の単一入口。人間・Claude・CI がすべて同じコマンドを使う -->

- コードを変更したら、タスク完了前に必ず `npm run verify` を実行して全項目を通すこと
- verify の内訳: prisma generate → ESLint → tsc --noEmit → vitest run
- 機械的に直せるスタイル違反は `npm run lint:fix` で自動修正してよい
- 編集直後の lint/型チェックは hook が自動実行する。エラーが返ってきたら
  その場で修正してから次の作業に進むこと

### 既知の環境問題: Windows側からのUNCパスアクセス時のvitestクラッシュ

作業ディレクトリが `\\wsl.localhost\Ubuntu\...` のようなUNCパス(WSL2のファイルを
Windows側からネットワーク経由で見ている状態)だと、`vite-node` が
`process.cwd()[0]` をドライブレターと決め打ちしており、UNCパス(先頭が `\`)では
不正な正規表現でクラッシュして `vitest run` が実行できない
(`node_modules/vite-node/dist/utils.mjs` 内の実装起因。tsc/ESLintは影響を受けない)。

- **確実な回避策**: WSL(Ubuntu)のターミナルを直接開き、`cd ~/projects/talent-app` した上で
  `npm run verify` を実行する(ネイティブなLinuxパスになりバグを回避できる)
- Windows側のシェルからしか動けない場合、`node node_modules/typescript/bin/tsc --noEmit` /
  `node node_modules/eslint/bin/eslint.js .` は `node` 実行ファイルを直接叩けば動作するが、
  `vitest` はこの方法でも回避できない

**環境差異により処理が長時間化しそう、または通常の方法(`npm run verify`等)が
そのまま使えないと分かった場合は、回避策を試行錯誤して時間・トークンを消費する前に、
まずその旨を人間に報告し、次の指示を待つこと。**(例: 環境をまたぐ検証・大規模な
ワークアラウンド・重いsubagent呼び出しなどを勝手に何分もかけて実行しない)

## よく使うコマンド

```
npm run dev              # 開発サーバー
npm run verify           # フル検証 (lint + 型 + テスト)
npm run lint:fix         # 自動修正可能な lint 違反の修正
npx vitest run <path>    # 特定ファイルのテストのみ実行
npx prisma migrate dev --name <name>   # マイグレーション作成・適用
npx prisma generate      # schema 変更後のクライアント再生成
```

## コーディング規約

<!-- 「Claude が迷いがち・間違えがちな点」に絞って書く。一般論は書かない -->

- Server Components をデフォルトとし、`"use client"` は
  インタラクションが必要なコンポーネントに限定する
- データ取得は Server Component / Server Actions / Route Handler で行い、
  Prisma Client をクライアントコンポーネントから import しない
- Prisma Client は `lib/prisma.ts` のシングルトンを必ず経由する
  (サーバーレス環境でのコネクション枯渇防止)
- 認証チェックは `auth()` (Auth.js v5) を使う。`getServerSession` は v4 の API なので使わない
- スキーマ変更は必ず `prisma migrate dev` で行う (`db push` は禁止)
- Tailwind v4 を使用。`tailwind.config.js` ベースの v3 の書き方
  (`@tailwind base` 等) ではなく CSS ファーストの `@import "tailwindcss"` を使う
- 環境変数 (.env) の内容を読んだり、コードや会話に貼り付けたりしない

## テスト方針

- 新しいロジック (ユーティリティ、Server Actions、API) には Vitest のテストを追加する
- テストファイルは対象と同じディレクトリに `*.test.ts(x)` として置く
- DB 依存のテストはモックを使い、実際の Neon には接続しない

## ディレクトリ構成

<!-- 実装が進んだら実態に合わせて更新すること -->

```
app/            # App Router (ページ・レイアウト・Route Handler)
components/     # 共有 UI コンポーネント
lib/            # prisma シングルトン、auth 設定、ユーティリティ
prisma/         # schema.prisma、マイグレーション
docs/           # 仕様書 (スキーマ・画面・設計判断。上記「プロジェクトドキュメント」参照)
scripts/        # verify.sh 等の開発スクリプト
```

---

このプロジェクトの開発ハーネス(hooks・permissions・コマンド等)の全体像と
設計思想は `HARNESS.md` にまとまっている(主に人間向けの説明)。
