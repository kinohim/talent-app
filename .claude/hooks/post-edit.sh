#!/usr/bin/env bash
# =============================================================
# post-edit.sh — PostToolUse フック(このハーネスの心臓部)
# Claude がファイルを編集(Edit / MultiEdit / Write)するたびに自動実行され、
# 編集されたファイルを即座に lint + 型チェックする。
#
# 最重要ポイントは終了コードの意味:
#   exit 0 … 問題なし。何も起きない
#   exit 2 … stderr の内容が Claude にフィードバックされ、
#            Claude が自動で修正に向かう(=検証ループが人手なしで閉じる)
#   exit 1 … ユーザーに表示されるだけで Claude は気づかない(使わない)
# =============================================================

# 注意: set -e はあえて外している。
# lint 失敗で即スクリプト終了すると exit 2 に到達できないため。
set -uo pipefail

# 依存チェック: このスクリプトは jq (JSON パーサ) に依存している。
# 未インストールの環境で全編集がエラーになるのを防ぐため、
# jq がなければ警告だけ出して何もせず終了する(検証は verify.sh 側で担保される)。
if ! command -v jq >/dev/null 2>&1; then
  echo "post-edit hook: jq が見つかりません。'brew install jq' 等で導入してください" >&2
  exit 0
fi

# フックへの入力は stdin の JSON で渡される。
# 編集されたファイルのパスは tool_input.file_path に入っている。
file_path=$(jq -r '.tool_input.file_path // empty')

# 拡張子フィルタ: .prisma / .css / .md などの編集で ESLint を
# 走らせても無意味かエラーになる。対象を ts/tsx に絞ることで
# ノイズと待ち時間を減らす。対象外は何もせず正常終了。
if [[ ! "$file_path" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

errors=""

# ESLint は編集された1ファイルだけに絞る。
# 保存のたびにプロジェクト全体を lint すると遅すぎるため。
# フル検証(lint+型+テスト)はタスク完了時に verify.sh で行う段階分け。
if ! lint_out=$(npx eslint "$file_path" 2>&1); then
  errors+="[ESLint]\n${lint_out}\n"
fi

# 型チェックはプロジェクト全体に対して実行する。
# 型エラーは「他ファイルへの影響」として現れることが多く、
# 1ファイルだけの検査では見逃すため。
# ※体感が重い場合はこのブロックを削り、verify.sh 側に寄せてよい。
if ! tsc_out=$(npx tsc --noEmit 2>&1); then
  errors+="[tsc]\n${tsc_out}\n"
fi

if [[ -n "$errors" ]]; then
  # stderr に出力したうえで exit 2 を返すと、
  # この内容がそのまま Claude に渡り、自動修正のループが回る。
  echo -e "$errors" >&2
  exit 2
fi

exit 0
