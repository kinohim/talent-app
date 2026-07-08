# 0001: 技術スタックの決定

## 状況

チームの初期ドラフト（`docs/design.md`、`venv/`）はPython/Django + SQLiteで検討されていた。一方、本プロジェクトの目的の一つはAI駆動開発（CLAUDE.md・サブエージェント活用）の学習であり、短期間のハッカソンで設計〜実装〜テスト〜インフラを一気通貫でAIと進めやすい構成が望ましい。

## 決定

- 言語/フレームワーク: **Next.js（TypeScript）** ※フロントとAPIを1リポジトリで管理
- DB: **PostgreSQL**（Neon or Supabaseの無料枠を想定）
- ORM: **Prisma**
- 認証: **Auth.js（NextAuth）** の Credentials Provider（社員ID＋パスワード）

## 比較・理由

| 観点 | Next.js(TS) | React+Node/Express分離 | Python(Django/FastAPI) |
|---|---|---|---|
| 開発スピード | 1リポジトリ・1デプロイで完結 | 2プロジェクトの連携コストが増える | フロントは別途必要になり2言語構成に |
| AI駆動開発との相性 | CLAUDE.md・サブエージェントを1本化しやすい | フロント/バックでハーネスが分かれやすい | 言語も分かれ文脈共有コストがさらに増える |
| デプロイ | Vercel等で最小構成 | フロント・バック別々に必要 | 同様に2系統必要 |
| このアプリとの適合 | フォーム・PDF/CSV入出力のエコシステムが充実 | 同左 | 今回の要件（フォーム・CRUD中心）にはオーバースペック |

DBをSQLiteではなくPostgreSQLにした理由: Next.jsをVercel等のサーバーレス環境にデプロイする場合、SQLiteはファイルシステムが永続化されないため運用に向かない。ハッカソンでの「インフラ」評価軸（DB構築）を実際に見せる上でも、マネージドPostgreSQLを使う方が実践的。

## 影響

- `venv/`ディレクトリ（Python/Django用）は今後使用しない。整理してよいか要確認
- `docs/design.md`（Django版ドラフト）は参考資料として残しつつ、実装方針は本ドキュメントおよび`docs/design/data-model.md`、`docs/design/screens.md`を正とする
