---
description: GitHub Issue を読んで原因調査・修正・検証・報告まで行う
argument-hint: <issue番号>
---

<!--
/fix-issue <issue番号>
役割: Issue 駆動の修正フローを一気通貫で定型化。
gh CLI を使う前提(MCP ではなくコンテキスト消費の軽い CLI 運用)。
frontmatter の description はコマンド一覧(/ 入力時のメニュー)に表示され、
argument-hint は引数の書き方のガイドとして表示される。
-->

GitHub Issue #$ARGUMENTS を解決してください。手順:

1. `gh issue view $ARGUMENTS` で Issue の内容とコメントを読む。
   本文に過去 Issue へのリンクや「再発の疑い」の記載がある場合は、
   その過去 Issue の原因と対応も確認する(前回の修正が調査の出発点になる)
2. 内容が曖昧・再現手順が不足している場合は、推測で進めず、
   何が不足しているかを報告して確認を取る
3. 関係するコードを調査し、原因の見立てを先に報告する
4. 修正を実装する。関連する仕様(docs/)がある場合は整合を確認する
5. 修正内容に対応するテストを追加または更新する
6. npm run verify を通す
7. 修正の要約(原因・対応・影響範囲)を報告し、承認を得てから
   `gh issue comment $ARGUMENTS` で対応内容を Issue にコメントする

注意: Issue のクローズは行わない(人間がレビュー後に閉じる)。
