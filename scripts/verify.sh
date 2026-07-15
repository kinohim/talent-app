#!/usr/bin/env bash
# =============================================================
# verify.sh — 検証の単一入口
# 人間・Claude・CI がすべて同じこのスクリプトを叩くことで、
# 「何をもって OK とするか」の基準がズレないようにする。
# 実行: npm run verify  (または bash scripts/verify.sh)
# =============================================================

# -e: どれか1つでも失敗したら即中断(失敗を握りつぶさない)
# -u: 未定義変数の使用をエラーにする
# -o pipefail: パイプ途中のコマンド失敗も検知する
set -euo pipefail

# Prisma Client は生成物のため、生成前だと tsc が型エラーで落ちる。
# clone 直後や CI 上でもこのスクリプト単体で通るように先頭で生成する。
echo "== Prisma Client 生成 =="
npx prisma generate

# 以降は「実行コストが安い順」に並べる (fail fast)。
# lint で落ちるコードに型チェックやテストの時間をかけない。

# ESLint: 最も速く、最も多くの問題を拾う工程なので最初。
echo "== ESLint =="
npm run lint

# 型チェック: next build にも型チェックは含まれるがビルドまで走って遅い。
# --noEmit なら型検査だけを高速に実行できる。
echo "== TypeScript 型チェック =="
npx tsc --noEmit

# テスト: vitest run は watch モードを無効化した1回実行。
# package.json の test スクリプト定義に依存しないよう直接叩く。
# --passWithNoTests: テストファイルが 0 件のとき vitest は失敗扱いにするが、
# プロジェクト立ち上げ直後から verify を使えるように「0 件は成功」とする。
# (テストが書かれ始めたら外して「テストなし」を検知できるようにしてもよい)
echo "== Vitest =="
npx vitest run --passWithNoTests

echo "✅ verify passed"
