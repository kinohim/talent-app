# 0006: 一覧のCSV/Excel出力機能を削除

## 状況

これまでの設計（要件定義書3.5、`docs/design/basic-design.md`、`docs/design/api-design.md`、`docs/design/screens.md`）ではプロフィール一覧・資格保有者一覧・スキル保有者一覧にCSV出力機能を持たせる想定で進めていた。ユーザーから「CSV/Excelでの出力は不要」との明確な指示があり、方針を変更する。

## 決定

- プロフィール一覧・資格保有者一覧・スキル保有者一覧を含む、一覧画面のCSV/Excel出力機能は**持たない**
- これらの画面は画面上での閲覧・検索・並び替えのみとする

## 理由

- 実際の利用シーンで一覧を外部ファイルに出力するニーズがないと判断された
- 出力機能（文字コード・カラム順・個別/一括の切り替えUI等）を作り込むコストをMVPの他機能に振り向けられる

## 影響

- `docs/requirements/requirements.md`: 3.5節・フェーズ表・決定事項一覧を更新
- `docs/design/basic-design.md`: 機能一覧・外部インターフェース概要からCSV出力の記載を削除
- `docs/design/screens.md`: S-09等からCSV出力ボタンの記載を削除
- `docs/design/api-design.md`: `/api/employees/export.csv`等のexport系エンドポイントを削除
- `docs/design/detailed-design.md`: 出力用CSV仕様セクションを削除し、Excel取込（ADR `0005`）の仕様に置き換え
- 将来的に出力ニーズが生じた場合は、その時点で改めて別ADRとして設計する

## 補足（2026-07-08更新）

画面体系を`01_画面一覧.pdf`に準拠させる決定（ADR `0007-screen-list-pdf-adoption.md`）で、**個人の経歴書単位のPDF出力（REF005 印刷用プレビュー）**が追加された。これは一覧の外部ファイル出力ではないため本ADRの対象外であり、「一覧のCSV/Excel出力は持たない」という本決定は引き続き有効。
