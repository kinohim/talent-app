# DB設計書

`docs/design/data-model.md`（データモデル設計・決定事項の記録）をベースに、テーブル定義をExcel化しやすい形式（物理名・論理名・型・制約・説明）に落とし込んだもの。元資料`20_設計/DB設計.csv`からの主な変更点は`data-model.md`の「元資料からの主な変更点」を参照。

このドキュメントの内容で問題なければ、`docs/design/excel-export/DB設計書.xlsx`としてExcel化する（テーブルごとに1シート、目次シート付き。既存の他Excel成果物と同じ体裁）。

## 共通カラム（全テーブル）

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| created_at | 作成日時 | DATETIME | | | | ○ | |
| created_by | 作成者 | VARCHAR(100) | | | | ○ | |
| updated_at | 更新日時 | DATETIME | | | | ○ | |
| updated_by | 更新者 | VARCHAR(100) | | | | ○ | |
| deleted_at | 削除日時 | DATETIME | | | | | NULL=有効データ、日付あり=削除済（論理削除） |
| deleted_by | 削除者 | VARCHAR(100) | | | | | |

以降の各テーブル定義では上記共通カラムは省略する（Excelシート上では各テーブルの末尾に共通カラムとして展開する）。

元資料にあった`created_program`/`updated_program`/`deleted_program`（実行プログラム名の記録）は、Next.jsのAPI設計とは相性が悪いため廃止した（`data-model.md`参照）。

## 1. user テーブル（認証・アカウント）

認証はAzure AD（Microsoft Entra ID）に委譲するため、`username`・`password_hash`・`password_reset_token`・`password_reset_expires_at`は廃止（ADR `0007-screen-list-pdf-adoption.md`）。

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | ユーザーID | SERIAL | ○ | | | ○ | |
| employee_id | 社員ID | VARCHAR(6) | | ○ | ○ | ○ | employeeテーブル参照。1対1で紐付け |
| email | メールアドレス | VARCHAR(100) | | | ○ | ○ | Azure ADとの照合キー。EDT006で事前登録 |
| role | ユーザー権限 | ENUM | | | | ○ | GENERAL:一般, MANAGER:管理職, HR_SALES:人事・営業, ADMIN:システム管理者（ADR `0008`） |
| is_active | 有効フラグ | BOOLEAN | | | | ○ | true:有効, false:退職・無効化済み（EDT007で変更。falseはログイン不可） |
| last_login_at | 最終ログイン日時 | TIMESTAMP | | | | | |

## 2. department テーブル（組織マスタ：事業部＞部署＞Gr）

管理職の編集範囲を「自部署のみ」とする決定（ADR `0002-manager-edit-scope-and-department.md`）で追加し、画面一覧PDF準拠の決定（ADR `0007`）で3階層の自己参照ツリーに拡張。

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | 組織ID | SERIAL | ○ | | | ○ | |
| code | 組織コード | VARCHAR(20) | | | ○ | ○ | |
| department_name | 組織名 | VARCHAR(100) | | | | ○ | |
| org_level | 階層区分 | ENUM | | | | ○ | DIVISION:事業部, DEPARTMENT:部署, GROUP:Gr |
| parent_id | 親組織ID | INT | | ○ | | | departmentテーブル自己参照。事業部はNULL |

閲覧・編集の権限判定は「部署（DEPARTMENT）レベルの組織単位の一致」で行う（`data-model.md`「権限判定ロジック」、ADR `0008`参照）。

## 3. employee テーブル（メインテーブル・経歴書）

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| employee_id | 社員ID | VARCHAR(6) | ○ | | | ○ | 6桁ゼロ埋め（例: `000001`、ADR `0003`） |
| name | 氏名 | VARCHAR(50) | | | | ○ | |
| name_kana | カナ | VARCHAR(50) | | | | ○ | |
| birth_date | 生年月日 | DATE | | | | | |
| gender | 性別 | ENUM | | | | | MALE:男性, FEMALE:女性, OTHER:その他 |
| department_id | 所属組織ID | INT | | ○ | | | departmentテーブル参照（通常はGrまたは部署レベル）。閲覧・編集の権限判定に使用（ADR `0008`）。異動履歴は持たず現在の所属のみ保持。管理者のみ編集可 |
| nearest_station_id | 最寄り駅ID | INT | | ○ | | | stationテーブル参照 |
| experience_years | 経験年数 | INT | | | | | |
| career_summary | 経歴概要 | TEXT | | | | | |
| self_pr | 自己PR | TEXT | | | | | |
| final_school_name | 最終学歴（学校名） | VARCHAR(100) | | | | | 自由記述 |
| final_department_name | 最終学歴（学部・学科名） | VARCHAR(100) | | | | | 自由記述 |
| final_school_type | 最終学歴（学校種別） | ENUM | | | | | HIGH_SCHOOL:高校, VOCATIONAL:専門学校, JUNIOR_COLLEGE:短大, UNIVERSITY:大学, GRAD_SCHOOL:大学院 |
| graduation_year_month | 卒業年月 | DATE | | | | | YYYYMM01で設定 |
| graduation_status | 卒業状況 | ENUM | | | | | GRADUATED:卒業, WITHDREW:中退 |

## 4. railway_line テーブル（路線マスタ）

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | 路線ID | SERIAL | ○ | | | ○ | |
| line_name | 路線名 | VARCHAR(100) | | | | ○ | JR山手線、東京メトロ銀座線など |

## 5. station テーブル（駅マスタ）

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | 駅ID | SERIAL | ○ | | | ○ | |
| station_name | 駅名 | VARCHAR(100) | | | | ○ | |

## 6. station_line_link テーブル（駅-路線 中間テーブル）

元資料の`station_lines_id`を`id`に統一。

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | 駅路線ID | SERIAL | ○ | | | ○ | |
| line_id | 路線ID | INT | | ○ | ○＊ | ○ | railway_lineテーブル参照 |
| station_id | 駅ID | INT | | ○ | ○＊ | ○ | stationテーブル参照 |

＊UNIQUE(line_id, station_id)の複合ユニーク制約。

## 7. skill_category テーブル（スキルカテゴリマスタ）

元資料は`id`と`skill_category_id`の2つのPKが定義されていたため、単一の連番PK（`id`）に統一し、業務コード（01, 02…）は`code`列のユニーク制約に変更（`data-model.md`参照）。

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | カテゴリID | SERIAL | ○ | | | ○ | |
| code | カテゴリコード | VARCHAR(10) | | | ○ | ○ | 01開発言語、02DB、03OS、04ツール、05開発工程… |
| category_name | カテゴリ名 | VARCHAR(100) | | | | ○ | |

## 8. skill テーブル（スキルマスタ）

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | スキルID | SERIAL | ○ | | | ○ | |
| category_id | カテゴリID | INT | | ○ | | ○ | skill_categoryテーブル参照 |
| skill_name | スキル名 | VARCHAR(100) | | | | ○ | Java、Python、MySQL、Linux、基本設計、実装等 |
| has_version | バージョン管理有無 | BOOLEAN | | | | ○ | trueの場合skill_versionで版を管理する |

## 9. skill_version テーブル（スキルバージョン）★新規

元資料では`employee_skill_link.skill_version`にVARCHARで直接バージョン名を持たせていたが、バージョンの並び順・リリース日・有効/無効を管理するため独立したマスタに変更（`data-model.md`参照）。

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | スキルバージョンID | SERIAL | ○ | | | ○ | |
| skill_id | スキルID | INT | | ○ | | ○ | skillテーブル参照 |
| version_name | バージョン名 | VARCHAR(100) | | | | ○ | 例: 8, 11, 17（Javaの場合） |
| version_order | 表示順 | INT | | | | | |
| release_date | リリース日 | DATE | | | | | |
| is_active | 有効フラグ | BOOLEAN | | | | ○ | |
| display_name | 表示名 | VARCHAR(150) | | | | | 自動生成: skill_name + version_name |

## 10. employee_skill_link テーブル（社員-スキル 中間テーブル）

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | 社員スキルID | SERIAL | ○ | | | ○ | |
| employee_id | 社員ID | VARCHAR(6) | | ○ | ○＊ | ○ | employeeテーブル参照 |
| skill_id | スキルID | INT | | ○ | ○＊ | ○ | skillテーブル参照 |
| skill_version_id | スキルバージョンID | INT | | ○ | ○＊ | | skill_versionテーブル参照（NULL可） |
| skill_level | 習熟度 | ENUM | | | | | LOW:△, MID:〇, HIGH:◎ |

＊UNIQUE(employee_id, skill_id, skill_version_id)。

## 11. certification_category テーブル（資格カテゴリマスタ）

skill_categoryと同様、PK重複を解消し単一連番PKに統一。

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | カテゴリID | SERIAL | ○ | | | ○ | |
| code | カテゴリコード | VARCHAR(10) | | | ○ | ○ | 10:IT系、20:語学系、30:業務系など |
| category_name | カテゴリ名 | VARCHAR(100) | | | | ○ | |
| description | 説明 | VARCHAR(255) | | | | | |

## 12. certification テーブル（資格マスタ）

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | 資格ID | SERIAL | ○ | | | ○ | |
| category_id | カテゴリID | INT | | ○ | | ○ | certification_categoryテーブル参照 |
| certification_name | 資格名 | VARCHAR(100) | | | | ○ | |
| certification_organization | 認定団体 | VARCHAR(100) | | | | | |

## 13. employee_certification_link テーブル（社員-資格 中間テーブル）

同じ資格を再取得するケースを考慮し、UNIQUE制約は付けない（履歴として複数行許容、`data-model.md`参照）。

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | 社員資格ID | SERIAL | ○ | | | ○ | |
| employee_id | 社員ID | VARCHAR(6) | | ○ | | ○ | employeeテーブル参照 |
| certification_id | 資格ID | INT | | ○ | | ○ | certificationテーブル参照 |
| acquired_date | 取得年月日 | DATE | | | | | |
| expiration_date | 有効期限日 | DATE | | | | | 資格の有効期限日 |

## 14. site テーブル（現場マスタ）★新規

プロジェクト経歴で使用する現場を管理するマスタ（MST005、ADR `0007`で新規追加）。「過去にどの現場に誰がいたか」の横断検索（REF002）の基盤。

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | 現場ID | SERIAL | ○ | | | ○ | |
| site_name | 現場名 | VARCHAR(100) | | | | ○ | |

## 15. project_role テーブル（現場ポジション／役割マスタ）

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | 役割ID | SERIAL | ○ | | | ○ | |
| role_name | 役割名 | VARCHAR(20) | | | | ○ | SE、PG、リーダー、サブリーダー等 |

## 16. project テーブル（プロジェクト経歴）

`site_name`（自由記述）は`site_id`（現場マスタ参照）に変更（ADR `0007`）。

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | プロジェクトID | SERIAL | ○ | | | ○ | |
| employee_id | 社員ID | VARCHAR(6) | | ○ | | ○ | employeeテーブル参照 |
| site_id | 現場ID | INT | | ○ | | ○ | siteテーブル参照 |
| project_title | プロジェクトタイトル | VARCHAR(100) | | | | ○ | |
| project_summary | プロジェクト概要 | TEXT | | | | | |
| start_date | 開始日 | DATE | | | | | |
| end_date | 終了日 | DATE | | | | | |
| total_team_size | 規模（全体人数） | VARCHAR(100) | | | | | 幅がある可能性もあるので自由記述 |
| team_size | 規模（チーム人数） | VARCHAR(100) | | | | | 幅がある可能性もあるので自由記述 |

`duration_months`（期間月数）は開始日・終了日から算出するため列としては持たない。

## 17. project_role_link テーブル（プロジェクト-役割 中間テーブル）

元資料のテーブル名`projects_role_link`・カラム名`project_irole_id`のタイプミスを修正（`project_role_link`・`project_role_id`）。

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | ID | SERIAL | ○ | | | ○ | |
| project_id | プロジェクトID | INT | | ○ | ○＊ | ○ | projectテーブル参照 |
| project_role_id | 役割ID | INT | | ○ | ○＊ | ○ | project_roleテーブル参照 |

＊UNIQUE(project_id, project_role_id)。

## 18. project_detail テーブル（プロジェクト詳細・業務工程）

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | 詳細ID | SERIAL | ○ | | | ○ | |
| project_id | プロジェクトID | INT | | ○ | ○ | ○ | projectテーブル参照（1対1） |
| overview | 業務詳細（概要） | VARCHAR(300) | | | | | |
| research_analysis | 業務詳細（調査分析） | BOOLEAN | | | | | true:対応あり、false:対応なし |
| requirements_definition | 業務詳細（要件定義） | BOOLEAN | | | | | true:対応あり、false:対応なし |
| basic_design | 業務詳細（基本設計） | BOOLEAN | | | | | true:対応あり、false:対応なし |
| detailed_design | 業務詳細（詳細設計） | BOOLEAN | | | | | true:対応あり、false:対応なし |
| development | 業務詳細（製造） | BOOLEAN | | | | | true:対応あり、false:対応なし |
| testing | 業務詳細（テスト） | BOOLEAN | | | | | true:対応あり、false:対応なし |
| operation | 業務詳細（運用） | BOOLEAN | | | | | true:対応あり、false:対応なし |

## 19. project_skill_link テーブル（プロジェクト-スキル 中間テーブル）

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
|---|---|---|---|---|---|---|---|
| id | プロジェクトスキルID | SERIAL | ○ | | | ○ | |
| project_id | プロジェクトID | INT | | ○ | ○＊ | ○ | projectテーブル参照 |
| skill_id | スキルID | INT | | ○ | ○＊ | ○ | skillテーブル参照 |
| skill_version_id | スキルバージョンID | INT | | ○ | ○＊ | | skill_versionテーブル参照（NULL可） |

＊UNIQUE(project_id, skill_id, skill_version_id)。

## ER図（テーブル関連の全体像）

```
employee 1─1 user
employee N─1 department（自己参照ツリー: 事業部＞部署＞Gr、parent_id）
employee 1─N employee_skill_link N─1 skill 1─N skill_version
employee 1─N employee_certification_link N─1 certification N─1 certification_category
employee 1─N project 1─1 project_detail
project N─1 site
project 1─N project_role_link N─1 project_role
project 1─N project_skill_link N─1 skill
employee N─1 station N─N railway_line（station_line_link経由）
skill N─1 skill_category
```

詳細な設計判断（権限判定ロジック・論理削除の運用方針等）は`docs/design/data-model.md`を参照。
