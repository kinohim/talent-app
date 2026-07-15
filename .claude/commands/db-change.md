---
description: db-migration スキルの手順で DB スキーマを変更する
argument-hint: <変更内容>
---

<!--
/db-change <変更内容の説明>
役割: スキーマ変更タスクの入口を定型化。
db-migration スキルの手順(特に「docs の更新」と「破壊的変更の事前承認」)に
確実に乗せるためのコマンド。
-->

以下の DB スキーマ変更を行ってください: $ARGUMENTS

必ず db-migration スキルの手順に従うこと。要点:

1. まず docs/schema.md の該当テーブルを読み、変更が仕様と整合するか確認する
2. 破壊的変更(カラム削除・型変更・NOT NULL 化)が含まれる場合は、
   影響とリスクを報告して承認を得てから実行する
3. prisma migrate dev でマイグレーションを作成する(db push は使わない)
4. 変更したモデルの影響範囲(参照コード)を修正する
5. docs/schema.md(必要なら er-diagram.md)を実装に合わせて更新する
6. npm run verify を通してから完了報告する
