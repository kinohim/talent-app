Next.jsアプリのソースコード（App Router）を格納するフォルダ。`package.json`等の設定ファイルはリポジトリ直下にある（Next.js標準の`src/`ディレクトリ構成）。

- `app/` — 画面（ページ）とAPIルート
- `components/` — 共通UIコンポーネント
- `lib/` — Prismaクライアント・認証（`auth.ts`）・権限判定（`authz.ts`）・バリデーション（`validation/`）等
- `types/` — 型定義の拡張（NextAuthのセッション型等）
- `middleware.ts` — 認証・権限の一次チェック
