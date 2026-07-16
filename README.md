# talent-app

社内向けタレントマネジメント（履歴書作成支援）アプリ。

## 目的

- 社内の履歴書作成業務を効率化する
- 社内AIハッカソンでの発表用成果物
- AI駆動開発（CLAUDE.md・サブエージェント活用）の実践と学習

## 技術スタック

- Next.js（TypeScript、App Router、`src/`ディレクトリ構成）／フロントとAPIを1リポジトリで管理
- DB: PostgreSQL（Neon/Supabase想定）／ORM: Prisma／認証: Auth.js（Credentials Provider）
- 詳細・選定理由は `docs/decisions.md` を参照（過去のADRは `BK/20260716_old-docs/decisions/` に保管）

## セットアップ

```bash
npm install
cp .env.example .env   # DATABASE_URL・NEXTAUTH_SECRETを設定
npm run prisma:migrate # 初回のみ。PostgreSQLへスキーマを反映
npm run prisma:seed    # サンプルデータ投入（部署・スキル・資格・社員3名など）
npm run dev
```

サンプルログイン（`prisma/seed.ts`参照、パスワードはいずれも`password123`）:

| 社員ID | 権限 |
|---|---|
| 000001 | システム管理者（ADMIN） |
| 000002 | 管理職（MANAGER） |
| 000003 | 一般社員（GENERAL） |

その他コマンド: `npm run typecheck` / `npm run lint` / `npm run build` / `npm run test`

## 実装スコープ

旧要件定義書（`BK/20260716_old-docs/requirements/requirements.md`）4章のフェーズ分けに対応。現在の仕様は `docs/` 直下の資料（`docs/README.md` 参照）を正とする。

- **フェーズ1（フル実装）**: ログイン、プロフィール一覧/詳細/編集（本人・自部署配下の編集含む）、部署・スキル・資格マスタCRUD、資格保有者一覧・スキル保有者一覧
- **フェーズ2（画面・APIの骨組みのみ）**: Excel取込、駅・路線／現場ポジションマスタ、パスワード変更・リセット、アカウント管理、現場（プロジェクト）経歴の詳細編集UI。対応するAPIルートは501 `NOT_IMPLEMENTED`を返すスタブ、画面は「フェーズ2で実装予定」の案内のみ表示する
- DBスキーマ（`prisma/schema.prisma`）はフェーズ1・2双方のテーブルを含む。プロフィール編集APIの現場経歴（`projects`）はキー省略時に既存データを変更しないため、フェーズ1のプロフィール編集画面から保存しても既存の現場経歴は消えない

## ディレクトリ構成

| フォルダ | 用途 |
|---|---|
| `.claude/` | サブエージェント定義（`agents/verifier.md`・`agents/code-reviewer.md`）・hooks・skillsなど開発ハーネス |
| `docs/` | 仕様書（スキーマ・画面・設計判断。`docs/README.md` 参照） |
| `docs/hackathon/` | ハッカソン発表用ロードマップ・評価軸マッピング・AI活用ログ |
| `prisma/` | Prisma schema・seedスクリプト |
| `src/app/` | Next.js App Router（画面・APIルート） |
| `src/components/` | 共通UIコンポーネント（`AdminMasterTable`、`ProfileForm`等） |
| `src/lib/` | Prismaクライアント・認証・権限判定・バリデーション等の共通ロジック |
| `tests/` | 自動テスト |
| `infra/` | DB構築・デプロイ・監視設定 |
| `slides/` | 発表用パワポ |
| `BK/` | 旧世代資料の退避先（Django版ドラフト、旧設計書一式 `20260716_old-docs/`、旧エージェント定義 `20260716_old-agents/`） |

## 開発の進め方

ハッカソンの評価軸（設計・実装・テスト・インフラ・ハーネス）に沿って進める。詳細は `docs/hackathon/roadmap.md` を参照。開発ハーネスの全体像は `HARNESS.md` を参照。
