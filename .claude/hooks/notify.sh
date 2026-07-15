#!/usr/bin/env bash
# =============================================================
# notify.sh — 完了・確認待ちの Windows 通知フック
# 対象環境: Windows + VSCode + WSL2 (Ubuntu) で Claude Code を実行している構成。
#
# 紐付けているイベント (settings.json 参照):
#   Stop         … Claude が応答を完了したとき(=作業完了)
#   Notification … Claude が許可や入力を待っているとき(=確認待ち)
#
# 仕組み: WSL2 内の notify-send は Windows に届かないため、
# WSL の相互運用機能で Windows 側の powershell.exe を呼び出し、
# 追加インストールなしでトースト通知を表示する。
#
# このフックは「通知するだけ」なので、失敗しても Claude の動作を
# 妨げないよう、どの経路でも必ず exit 0 で終わる。
# =============================================================
set -uo pipefail

# --- 入力の解釈 -------------------------------------------------
# フックへの入力は stdin の JSON。jq がなければ通知を諦めて素通り。
if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

input=$(cat)
event=$(jq -r '.hook_event_name // empty' <<<"$input")

# イベントごとに通知文を組み立てる。
# Notification イベントには message フィールド(例: 「◯◯の実行許可が必要です」)
# が入ってくるので、あればそれを使う。
case "$event" in
  Stop)
    title="Claude Code - 完了"
    msg="作業が完了しました"
    ;;
  Notification)
    title="Claude Code - 確認待ち"
    msg=$(jq -r '.message // "確認・入力を待っています"' <<<"$input")
    ;;
  *)
    title="Claude Code"
    msg="通知"
    ;;
esac

# PowerShell のシングルクォート文字列に安全に埋め込むため、
# タイトルとメッセージから引用符・改行を除去する(コマンド注入対策)。
msg=$(tr -d "'\"\r\n" <<<"$msg")
title=$(tr -d "'\"\r\n" <<<"$title")

# --- ターミナルベル(保険) --------------------------------------
# VSCode のターミナルはベルを受けるとタブにドットを表示する。
# トーストが何らかの理由で失敗しても最低限の合図は残るようにする。
printf '\a'

# --- powershell.exe の場所を特定 --------------------------------
# 通常は WSL の PATH に powershell.exe が通っている(Windows 相互運用)。
# /etc/wsl.conf で appendWindowsPath=false にしている環境向けに
# フルパスのフォールバックも用意する。
ps_exe=""
if command -v powershell.exe >/dev/null 2>&1; then
  ps_exe="powershell.exe"
elif [[ -x "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe" ]]; then
  ps_exe="/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
else
  # WSL 以外の環境(素の Linux 等)で使われた場合は notify-send を試す
  command -v notify-send >/dev/null 2>&1 && notify-send "$title" "$msg"
  exit 0
fi

# --- Windows トースト通知 ----------------------------------------
# WinRT の ToastNotification API を直接使う(モジュール追加インストール不要)。
# AppId には PowerShell 標準の ID を使う。未登録の適当な文字列だと
# 環境によって通知が表示されないことがあるため。
"$ps_exe" -NoProfile -Command "
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType=WindowsRuntime] | Out-Null
\$xml = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
\$xml.GetElementsByTagName('text').Item(0).AppendChild(\$xml.CreateTextNode('$title')) | Out-Null
\$xml.GetElementsByTagName('text').Item(1).AppendChild(\$xml.CreateTextNode('$msg')) | Out-Null
\$appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier(\$appId).Show([Windows.UI.Notifications.ToastNotification]::new(\$xml))
" >/dev/null 2>&1

# 通知の成否に関わらず Claude の動作は止めない
exit 0
