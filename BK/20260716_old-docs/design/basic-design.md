# 基本設計書（タレントマネジメントアプリ）

## 0. 位置づけ

本書は`docs/requirements/requirements.md`（要件定義書）を受けて、システム全体の構成・機能・画面・データ・非機能要件を確定する基本設計書である。画面ごとの項目定義やAPIの詳細は`docs/design/detailed-design.md`（詳細設計書）に分離する。

参照関係:

```
要件定義書 (docs/requirements/requirements.md)
  └─ 基本設計書 (本書)
       ├─ データモデル詳細 (docs/design/data-model.md)
       ├─ 画面一覧・遷移詳細 (docs/design/screens.md ※01_画面一覧.pdf準拠)
       └─ 詳細設計書 (docs/design/detailed-design.md)
              └─ API設計書 (docs/design/api-design.md)
```

意思決定の経緯は`docs/decisions/`のADR（`0001`〜`0008`）を参照。特に画面体系・認証方式はADR `0007`、閲覧権限はADR `0008`で2026-07-08に大きく改訂した。

## 1. システム構成

### 1.1 アーキテクチャ概要

```
[ブラウザ]
   │ HTTPS
   ▼
[Next.js アプリ（フロント + API Routes を1リポジトリで提供）]
   │  - ページ/UIコンポーネント（App Router）
   │  - middleware.ts（認証・権限の一次チェック）
   │  - API Routes（/api/配下、詳細はapi-design.md）
   │  - Auth.js（Microsoft Entra IDプロバイダ、ADR 0007）
   │
   ├─ 認証リダイレクト ─▶ [Azure AD（Microsoft Entra ID）]
   │
   ▼ Prisma Client
[PostgreSQL（Neon or Supabase）]
```

- フロントとAPIを1つのNext.jsアプリに統合し、デプロイ先はVercel等のサーバーレス環境を想定（ADR `0001-tech-stack.md`）
- 認証はAzure AD（Microsoft Entra ID）へのリダイレクトログイン。Auth.jsは継続利用し、プロバイダをCredentialsからMicrosoft Entra IDに変更（ADR `0007`）。パスワードの保存・変更・リセット機能は本システムでは持たない
- Azure ADで認証されたユーザーは、メールアドレスを照合キーとして本システムの`User`（事前登録済みアカウント）と突合する。未登録・退職無効化済みの場合はログインエラーとする
- DBはマネージドPostgreSQL。ローカル開発時も同一のPostgreSQLに接続する構成とし、SQLiteとの差異による不具合を避ける

### 1.2 環境

| 環境 | 用途 | DB |
|---|---|---|
| ローカル開発 | 個人開発環境 | Neon/Supabaseの開発用ブランチ or 別プロジェクト |
| 本番（ハッカソンデモ用） | デモ・発表用 | Neon/Supabase本番プロジェクト |

Azure ADのテナント・アプリ登録（クライアントID/シークレット）は環境ごとに用意する。デモ環境でEntra IDが使えない場合の代替は❓未確定（要件定義書5.2）。インフラの具体的な構築手順は`infra/`配下で別途整理する（評価軸「インフラ」に対応）。

## 2. 機能一覧

要件定義書3章の機能をフェーズ別に整理（詳細は要件定義書を参照）。

| フェーズ | 機能カテゴリ | 主な機能 |
|---|---|---|
| 1（MVP） | 認証 | Azure AD（Entra ID）ログイン、アカウント突合（AUTH001） |
| 1 | 経歴書 | 経歴書一覧・検索（REF002、閲覧権限制御含む）、経歴書詳細（REF003）、マイページ（REF004）、基本情報／経歴概要・自己PR／スキル／資格の登録編集（EDT001〜004） |
| 1 | マスタ管理 | スキル（MST001）、資格（MST002）、部署・組織階層（MST004） |
| 2 | 経歴書 | プロジェクト経歴登録（EDT005）、プロジェクト経歴一覧（REF006）、印刷用プレビュー・PDF出力（REF005） |
| 2 | マスタ管理 | 現場ポジション（MST003）、現場（MST005）、アカウント管理（REF007/EDT006/EDT007） |
| 2 | 入出力 | 初回データ投入スクリプト（取込画面は持たない、ADR `0005`・`0007`） |
| 3 | 可視化・UI/UX | スキルマップ／組織ダッシュボード（REF008）、検索・絞り込み強化、デザイン作り込み |

一覧のCSV/Excel出力機能は持たない（ADR `0006-remove-export-feature.md`）。個人経歴書のPDF出力（REF005）は対象が異なるため提供する（ADR `0007`）。

## 3. 画面設計（サマリ）

画面一覧・ルーティング・遷移の詳細は`docs/design/screens.md`を参照（`01_画面一覧.pdf`準拠の22画面）。基本設計として押さえるべき方針のみ以下に記す。

- 認証（AUTH001）、参照系（REF001〜REF008）、登録・編集系（EDT001〜EDT007）、マスタ管理系（MST001〜MST005）、共通部品（CMN001）の5グループ
- マスタ管理系（MST001〜005）・アカウント一覧（REF007）は共通コンポーネント（`AdminMasterTable`）を使い回す。部署マスタ（MST004）のみ階層ツリー表示が必要なため拡張または専用実装
- 経歴書の編集はセクション単位（EDT001〜005）。本人編集（マイページ経由）と他社員編集（MANAGER/ADMIN、経歴書詳細経由）で同一フォームコンポーネントを共通化し、権限フラグで編集可能項目（所属組織欄はADMINのみ）を出し分ける
- 権限による画面アクセス制御は`middleware.ts`（一次チェック）とAPI側の認可チェック（最終判定）の二重構成とする。**経歴書詳細の閲覧制限（GENERALは自部署のみ）もAPI側で必ず判定する**（ADR `0008`）

## 4. データモデル設計（サマリ）

テーブル定義・ER図・権限判定ロジックの詳細は`docs/design/data-model.md`を参照。基本設計として押さえるべき全体構造は以下。

```
User（認証・アカウント） 1─1 Employee（経歴書） N─1 Department（組織：事業部＞部署＞Grの3階層、自己参照）
Employee 1─N EmployeeSkillLink N─1 Skill N─1 SkillCategory（Skillは1─N SkillVersion）
Employee 1─N EmployeeCertificationLink N─1 Certification N─1 CertificationCategory
Employee 1─N Project 1─1 ProjectDetail
Project N─1 Site（現場マスタ ★新規）
Project 1─N ProjectRoleLink N─1 ProjectRole
Project 1─N ProjectSkillLink N─1 Skill
Employee N─1 Station N─N RailwayLine（StationLineLink経由）
```

- 認証情報（`User`）と経歴書データ（`Employee`）は1対1で分離。`User`はAzure AD照合キー（メールアドレス）・権限・アカウント状態（有効/無効）を持ち、パスワードは持たない（ADR `0007`）
- 認可判定に必要な`role`・所属組織・判定用の部署レベル組織IDはセッションに載せて毎リクエストで参照できるようにする
- 全テーブル共通で`createdAt/createdBy/updatedAt/updatedBy/deletedAt/deletedBy`を持ち、論理削除で運用する

## 5. 権限設計

要件定義書3.1の権限マトリクスを再掲し、判定方法を明記する。ロールは4階層（ADR `0008`）。

| 機能 | GENERAL | MANAGER | HR_SALES | ADMIN | 判定方法 |
|---|---|---|---|---|---|
| 自分の経歴書編集 | ○ | ○ | ○ | ○ | `session.employeeId === target.employeeId` |
| 他社員の経歴書詳細閲覧 | ○（自部署のみ） | ○（全社員） | ○（全社員） | ○（全社員） | GENERALのみ`deptOf(session) === deptOf(target)`（部署レベル解決後の一致）、他ロールは制限なし |
| 経歴書一覧の横断検索 | ○ | ○ | ○ | ○ | 制限なし（**検索結果には他部署も表示**。GENERALには行ごとの詳細閲覧可否フラグを返す） |
| 他社員の経歴書編集 | × | ○（自部署のみ） | × | ○（全社員） | `deptOf(session) === deptOf(target)`（MANAGER）／常にtrue（ADMIN） |
| ダッシュボード閲覧 | ○ | ○ | ○ | ○ | 制限なし（保有者名から詳細への遷移は閲覧判定に従う） |
| PDF出力（REF005） | ○ | ○ | ○ | ○ | 対象経歴書の閲覧判定に従う |
| マスタ管理 | × | × | × | ○ | `session.role === 'ADMIN'` |
| アカウント管理 | × | × | × | ○ | `session.role === 'ADMIN'` |

- `deptOf(x)`＝所属組織から祖先をたどって「部署（DEPARTMENT）」レベルの組織単位を解決する関数。所属がGrなら親の部署、所属が部署ならその部署自身。解決できない場合（未設定・事業部直属）は安全側に倒す（詳細は`docs/design/data-model.md`「権限判定ロジック」）
- 権限チェックの実装方式（middlewareとAPIでの二重チェックの具体的な書き方）は`docs/design/detailed-design.md`で扱う

## 6. 外部インターフェース概要

| インターフェース | 概要 | 詳細 |
|---|---|---|
| 認証 | Azure AD（Microsoft Entra ID）リダイレクトログイン。Auth.jsのMicrosoft Entra IDプロバイダを使用し、メールアドレスで`User`と突合 | `docs/design/detailed-design.md` |
| API | Next.js API Routes（REST風） | `docs/design/api-design.md` |
| 初回データ投入 | スクリプトによる直接投入（取込画面・APIは持たない。ADR `0005`・`0007`）。ファイル形式はExcel（.xlsx） | `docs/decisions/0005-csv-import-scope.md` |
| PDF出力 | 個人経歴書単位のPDF出力（REF005）。実現方式は❓フェーズ2着手時に決定 | `docs/design/screens.md` |
| 出力機能（一覧） | 一覧のCSV/Excel出力は持たない（ADR `0006`） | `docs/decisions/0006-remove-export-feature.md` |

パスワードリセットメール送信は認証のAzure AD移行に伴い廃止（メール送信インターフェース自体が不要になった）。

## 7. 非機能要件

- **セキュリティ**: 認証はAzure ADに委譲（パスワードを本システムで保持しない）。権限に応じた画面・API制御（経歴書詳細の閲覧制限を含む）を必須とする。HTTPS前提
- **性能**: 社内利用・数十〜数百名規模を想定し、特別な性能要件は設けない（ページネーション程度の配慮で十分）
- **可用性・運用**: 本運用の可用性目標（SLA、監視、バックアップ）は今回のスコープ外とする。ハッカソン後に本運用へ進める場合は本節を見直す（要件定義書5.2参照）
- **ブラウザ対応**: 社内利用のモダンブラウザ（Chrome/Edge最新版）のみ対応とし、レガシーブラウザは対象外
- **アクセシビリティ**: 特別な対応は今回のスコープ外（フェーズ3のデザイン作り込み時に検討）

## 8. 今後の課題（基本設計時点での未確定事項）

- Azure ADテナント・アプリ登録の準備（開発・デモ環境それぞれ）。デモでEntra IDが使えない場合の代替認証
- PDF出力（REF005）の実現方式（ブラウザ印刷ベース／サーバーサイドPDF生成）
- 部署マスタ（事業部＞部署＞Gr）の初期データ整備（誰がいつ用意するか）
- 駅・路線データの保守運用（管理画面を持たないためスクリプト対応）
- 本運用を見据えた場合の非機能要件の再設計（7章）
- インフラ構築の詳細手順（`infra/`で別途整理）
- **既存実装（NextAuth Credentials・旧S-xx画面ベース）と本設計の乖離の解消**（ADR `0007`「影響」参照）
