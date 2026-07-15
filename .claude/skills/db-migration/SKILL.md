---
name: db-migration
description: DB スキーマの変更・マイグレーション作成時に使う手順書。Prisma の schema.prisma を変更するとき、テーブルやカラムの追加・変更・削除を行うとき、マイグレーションのエラーを解決するときに必ず参照する。
---

# DB マイグレーション手順 (Prisma 7 + Neon)

<!--
このスキルの役割:
CLAUDE.md に書くには長すぎる「スキーマ変更の正しい手順」を切り出したもの。
frontmatter の description を見て Claude が自動で読み込むため、
description には「いつ使うか」を具体的に書いておくことが重要。
-->

## 手順(必ずこの順で)

1. **仕様確認**: `docs/schema.md` の該当テーブルの節を読み、変更が仕様と
   整合するか確認する。仕様にない変更なら、先に人間に確認する
2. **schema.prisma を編集**する
3. **マイグレーション作成・適用**:
   ```
   npx prisma migrate dev --name <変更内容を表す英語名>
   ```
   命名例: `add_certification_table`, `make_email_unique`
4. `npx prisma generate` が自動実行されるが、型エラーが残る場合は手動で再実行する
5. **影響範囲の修正**: 変更したモデルを参照しているコードを修正する
6. **docs の更新**: `docs/schema.md`(と必要なら `docs/er-diagram.md`)を
   実装に合わせて更新する。コードだけ変えて docs を放置しない
7. `npm run verify` で全検証を通す

## 禁止事項

- `npx prisma db push` は使わない(マイグレーション履歴が壊れる。settings.json でも deny 済み)
- `npx prisma migrate reset` は使わない(DB 全消去。必要なら人間に依頼する)
- 生成された `prisma/migrations/**/migration.sql` を手で書き換えない。
  **ただし唯一の例外**: `employee_skill` の複合ユニークには PostgreSQL の
  `UNIQUE NULLS NOT DISTINCT` が必要だが、Prisma 7 はこの構文を
  スキーマでネイティブサポートしないため、該当マイグレーションの
  `CREATE UNIQUE INDEX` 末尾に `NULLS NOT DISTINCT` を手動追記する
  (docs/decisions.md「スキル・資格・マスタ全般」参照)。
  追記した場合は適用前に人間に差分を提示して承認を得ること

## Neon 固有の注意

- 接続は `@prisma/adapter-neon` 経由。直接 `new PrismaClient()` に
  接続文字列を渡すコードを書かない(`lib/prisma.ts` のシングルトンを使う)
- 接続文字列は `.env` にあるが、読み取りは deny されている。
  接続確認が必要なときは人間に依頼する

## 破壊的変更(カラム削除・型変更・NOT NULL 化)のとき

- 既存データが失われる/マイグレーションが失敗する可能性を先に人間へ報告し、
  承認を得てから実行する
- NOT NULL 化はデフォルト値の設定か、既存行のバックフィル手順をセットで提案する
