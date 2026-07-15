---
description: docs/screens.md の仕様に従って画面を実装する
argument-hint: <画面名>
---

<!--
/implement-screen <画面名 or docs/screens.md の節名>
役割: 画面実装タスクの「入口」を定型化するコマンド。
new-screen スキルの手順に乗せることを強制し、
仕様確認をすっ飛ばした実装を防ぐ。
$ARGUMENTS にはコマンド実行時の引数がそのまま入る。
-->

以下の画面を実装してください: $ARGUMENTS

必ず new-screen スキルの手順に従うこと。要点:

1. まず docs/screens.md の該当画面の節と、関係する docs/schema.md のテーブル定義を読む
2. 仕様に不明点・矛盾があれば、実装を始める前に質問する
3. 実装の型(Server Component 基本、認可チェック必須)を守る
4. 完了前に new-screen スキルのチェックリストを自己確認し、npm run verify を通す
5. 最後に、仕様との差異(あれば)と実装した内容を簡潔に報告する
