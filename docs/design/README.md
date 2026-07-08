設計工程の成果物を格納するフォルダ。

**画面構成は`excel-export/01_画面一覧.pdf`（22画面）を正とする**（ADR `0007-screen-list-pdf-adoption.md`、2026-07-08決定）。閲覧権限（一般ユーザーは自部署のみ詳細閲覧可）はADR `0008-view-permission-department-scope.md`を参照。

- `basic-design.md` — 基本設計書（システム構成・機能一覧・画面/データモデル概要・権限設計・非機能要件）
- `data-model.md` — データモデル（ER設計）詳細
- `db-design.md` — DB設計書（テーブルごとの物理名・論理名・型・制約。Excel化の元資料）
- `screens.md` — 画面一覧・遷移設計詳細（`01_画面一覧.pdf`準拠）
- `screens-review.html` — 旧仕様（S-01〜S-20）のワイヤーフレームレビュー用ドラフト。**現行の画面体系とは異なるため参考資料扱い**
- `api-design.md` — API設計書（エンドポイント一覧・共通仕様）
- `detailed-design.md` — 詳細設計書（画面項目定義・権限チェック実装方針・初回データ投入スクリプト仕様・認証詳細）
- `excel-export/` — 上記をExcel化したもの（詳細は`excel-export/README.md`参照）
- `10_要件検討/`, `20_設計/` — チームが作成した元資料（アプリ作成案、DB設計、機能一覧、画面イメージ図など）

読む順序の目安: `basic-design.md` → `data-model.md`/`db-design.md`/`screens.md`/`screens-review.html` → `api-design.md` → `detailed-design.md`。

ハッカソン評価軸「設計工程」に対応。AIとの壁打ちで決めた内容は `docs/decisions/` にも記録する。
