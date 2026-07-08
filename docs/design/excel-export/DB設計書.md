# DB設計書

## 目次

**DB設計書**

| No | シート名 | リンク |
| --- | --- | --- |
| 1 | 01_共通カラム | [開く](#01_共通カラム) |
| 2 | 02_user | [開く](#02_user) |
| 3 | 03_department | [開く](#03_department) |
| 4 | 04_employee | [開く](#04_employee) |
| 5 | 05_railway_line | [開く](#05_railway_line) |
| 6 | 06_station | [開く](#06_station) |
| 7 | 07_station_line_link | [開く](#07_station_line_link) |
| 8 | 08_skill_category | [開く](#08_skill_category) |
| 9 | 09_skill | [開く](#09_skill) |
| 10 | 10_skill_version | [開く](#10_skill_version) |
| 11 | 11_employee_skill_link | [開く](#11_employee_skill_link) |
| 12 | 12_certification_category | [開く](#12_certification_category) |
| 13 | 13_certification | [開く](#13_certification) |
| 14 | 14_employee_certification_link | [開く](#14_employee_certification_link) |
| 15 | 15_project_role | [開く](#15_project_role) |
| 16 | 16_project | [開く](#16_project) |
| 17 | 17_project_role_link | [開く](#17_project_role_link) |
| 18 | 18_project_detail | [開く](#18_project_detail) |
| 19 | 19_project_skill_link | [開く](#19_project_skill_link) |
| 20 | 20_ER図 | [開く](#20_er図) |

## 01_共通カラム

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| created_at | 作成日時 | DATETIME |  |  |  | ○ |  |
| created_by | 作成者 | VARCHAR(100) |  |  |  | ○ |  |
| updated_at | 更新日時 | DATETIME |  |  |  | ○ |  |
| updated_by | 更新者 | VARCHAR(100) |  |  |  | ○ |  |
| deleted_at | 削除日時 | DATETIME |  |  |  |  | NULL=有効データ、日付あり=削除済（論理削除） |
| deleted_by | 削除者 | VARCHAR(100) |  |  |  |  |  |
| 以降の各テーブルシートでは上記共通カラムを除いた固有カラムのみ掲載する。元資料のcreated_program/updated_program/deleted_programは、Next.jsのAPI設計とは相性が悪いため廃止した。 |  |  |  |  |  |  |  |

## 02_user

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | ユーザーID | SERIAL | ○ |  |  | ○ |  |
| employee_id | 社員ID | VARCHAR(6) |  | ○ | ○ | ○ | employeeテーブル参照。1対1で紐付け |
| username | ユーザー名 | VARCHAR(100) |  |  |  | ○ |  |
| password_hash | パスワード（ハッシュ値） | VARCHAR(255) |  |  |  | ○ | bcrypt想定 |
| role | ユーザー権限 | ENUM |  |  |  | ○ | GENERAL:一般, MANAGER:管理職, ADMIN:システム管理者 |
| email | メールアドレス | VARCHAR(100) |  |  |  |  | パスワードリセットメール送信先（フェーズ2） |
| last_login_at | 最終ログイン日時 | TIMESTAMP |  |  |  |  |  |
| password_reset_token | パスワードリセットトークン | VARCHAR(100) |  |  |  |  |  |
| password_reset_expires_at | パスワードリセットトークン有効期限 | TIMESTAMP |  |  |  |  | 発行から1時間想定（detailed-design.md） |

## 03_department

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | 部署ID | SERIAL | ○ |  |  | ○ |  |
| code | 部署コード | VARCHAR(20) |  |  | ○ | ○ |  |
| department_name | 部署名 | VARCHAR(100) |  |  |  | ○ |  |
| ※ departmentテーブル（部署マスタ）★新規: 管理職の編集範囲を「自部署配下」とする決定（ADR 0002）に伴い新規追加。MVPでは部署の親子階層は持たない、フラットな一覧とする。 |  |  |  |  |  |  |  |

## 04_employee

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| employee_id | 社員ID | VARCHAR(6) | ○ |  |  | ○ | 6桁ゼロ埋め（例: 000001、ADR 0003） |
| name | 氏名 | VARCHAR(50) |  |  |  | ○ |  |
| name_kana | カナ | VARCHAR(50) |  |  |  | ○ |  |
| birth_date | 生年月日 | DATE |  |  |  |  |  |
| gender | 性別 | ENUM |  |  |  |  | MALE:男性, FEMALE:女性, OTHER:その他 |
| department_id | 所属部署ID | INT |  | ○ |  |  | departmentテーブル参照。異動履歴は持たず現在の所属のみ保持。管理者のみ編集可 |
| nearest_station_id | 最寄り駅ID | INT |  | ○ |  |  | stationテーブル参照 |
| experience_years | 経験年数 | INT |  |  |  |  |  |
| career_summary | 経歴概要 | TEXT |  |  |  |  |  |
| self_pr | 自己PR | TEXT |  |  |  |  |  |
| final_school_name | 最終学歴（学校名） | VARCHAR(100) |  |  |  |  | 自由記述 |
| final_department_name | 最終学歴（学部・学科名） | VARCHAR(100) |  |  |  |  | 自由記述 |
| final_school_type | 最終学歴（学校種別） | ENUM |  |  |  |  | HIGH_SCHOOL:高校, VOCATIONAL:専門学校, JUNIOR_COLLEGE:短大, UNIVERSITY:大学, GRAD_SCHOOL:大学院 |
| graduation_year_month | 卒業年月 | DATE |  |  |  |  | YYYYMM01で設定 |
| graduation_status | 卒業状況 | ENUM |  |  |  |  | GRADUATED:卒業, WITHDREW:中退 |

## 05_railway_line

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | 路線ID | SERIAL | ○ |  |  | ○ |  |
| line_name | 路線名 | VARCHAR(100) |  |  |  | ○ | JR山手線、東京メトロ銀座線など |

## 06_station

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | 駅ID | SERIAL | ○ |  |  | ○ |  |
| station_name | 駅名 | VARCHAR(100) |  |  |  | ○ |  |

## 07_station_line_link

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | 駅路線ID | SERIAL | ○ |  |  | ○ |  |
| line_id | 路線ID | INT |  | ○ | ○＊ | ○ | railway_lineテーブル参照 |
| station_id | 駅ID | INT |  | ○ | ○＊ | ○ | stationテーブル参照 |
| ※ station_line_linkテーブル（駅-路線 中間テーブル）: 元資料のstation_lines_idをidに統一。＊UNIQUE(line_id, station_id)の複合ユニーク制約。 |  |  |  |  |  |  |  |

## 08_skill_category

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | カテゴリID | SERIAL | ○ |  |  | ○ |  |
| code | カテゴリコード | VARCHAR(10) |  |  | ○ | ○ | 01開発言語、02DB、03OS、04ツール、05開発工程… |
| category_name | カテゴリ名 | VARCHAR(100) |  |  |  | ○ |  |
| ※ skill_categoryテーブル（スキルカテゴリマスタ）: 元資料はidとskill_category_idの2つのPKが定義されていたため、単一の連番PK（id）に統一し、業務コード（01, 02…）はcode列のユニーク制約に変更。 |  |  |  |  |  |  |  |

## 09_skill

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | スキルID | SERIAL | ○ |  |  | ○ |  |
| category_id | カテゴリID | INT |  | ○ |  | ○ | skill_categoryテーブル参照 |
| skill_name | スキル名 | VARCHAR(100) |  |  |  | ○ | Java、Python、MySQL、Linux、基本設計、実装等 |
| has_version | バージョン管理有無 | BOOLEAN |  |  |  | ○ | trueの場合skill_versionで版を管理する |

## 10_skill_version

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | スキルバージョンID | SERIAL | ○ |  |  | ○ |  |
| skill_id | スキルID | INT |  | ○ |  | ○ | skillテーブル参照 |
| version_name | バージョン名 | VARCHAR(100) |  |  |  | ○ | 例: 8, 11, 17（Javaの場合） |
| version_order | 表示順 | INT |  |  |  |  |  |
| release_date | リリース日 | DATE |  |  |  |  |  |
| is_active | 有効フラグ | BOOLEAN |  |  |  | ○ |  |
| display_name | 表示名 | VARCHAR(150) |  |  |  |  | 自動生成: skill_name + version_name |
| ※ skill_versionテーブル（スキルバージョン）★新規: 元資料ではemployee_skill_link.skill_versionにVARCHARで直接バージョン名を持たせていたが、バージョンの並び順・リリース日・有効/無効を管理するため独立したマスタに変更。 |  |  |  |  |  |  |  |

## 11_employee_skill_link

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | 社員スキルID | SERIAL | ○ |  |  | ○ |  |
| employee_id | 社員ID | VARCHAR(6) |  | ○ | ○＊ | ○ | employeeテーブル参照 |
| skill_id | スキルID | INT |  | ○ | ○＊ | ○ | skillテーブル参照 |
| skill_version_id | スキルバージョンID | INT |  | ○ | ○＊ |  | skill_versionテーブル参照（NULL可） |
| skill_level | 習熟度 | ENUM |  |  |  |  | LOW:△, MID:〇, HIGH:◎ |
| ※ employee_skill_linkテーブル（社員-スキル 中間テーブル）: ＊UNIQUE(employee_id, skill_id, skill_version_id)。 |  |  |  |  |  |  |  |

## 12_certification_category

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | カテゴリID | SERIAL | ○ |  |  | ○ |  |
| code | カテゴリコード | VARCHAR(10) |  |  | ○ | ○ | 10:IT系、20:語学系、30:業務系など |
| category_name | カテゴリ名 | VARCHAR(100) |  |  |  | ○ |  |
| description | 説明 | VARCHAR(255) |  |  |  |  |  |
| ※ certification_categoryテーブル（資格カテゴリマスタ）: skill_categoryと同様、PK重複を解消し単一連番PKに統一。 |  |  |  |  |  |  |  |

## 13_certification

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | 資格ID | SERIAL | ○ |  |  | ○ |  |
| category_id | カテゴリID | INT |  | ○ |  | ○ | certification_categoryテーブル参照 |
| certification_name | 資格名 | VARCHAR(100) |  |  |  | ○ |  |
| certification_organization | 認定団体 | VARCHAR(100) |  |  |  |  |  |

## 14_employee_certification_link

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | 社員資格ID | SERIAL | ○ |  |  | ○ |  |
| employee_id | 社員ID | VARCHAR(6) |  | ○ |  | ○ | employeeテーブル参照 |
| certification_id | 資格ID | INT |  | ○ |  | ○ | certificationテーブル参照 |
| acquired_date | 取得年月日 | DATE |  |  |  |  |  |
| expiration_date | 有効期限日 | DATE |  |  |  |  | 資格の有効期限日 |
| ※ employee_certification_linkテーブル（社員-資格 中間テーブル）: 同じ資格を再取得するケースを考慮し、UNIQUE制約は付けない（履歴として複数行許容）。 |  |  |  |  |  |  |  |

## 15_project_role

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | 役割ID | SERIAL | ○ |  |  | ○ |  |
| role_name | 役割名 | VARCHAR(20) |  |  |  | ○ | SE、PG、リーダー、サブリーダー等 |

## 16_project

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | プロジェクトID | SERIAL | ○ |  |  | ○ |  |
| employee_id | 社員ID | VARCHAR(6) |  | ○ |  | ○ | employeeテーブル参照 |
| site_name | 現場名 | VARCHAR(100) |  |  |  | ○ |  |
| project_title | プロジェクトタイトル | VARCHAR(100) |  |  |  | ○ |  |
| project_summary | プロジェクト概要 | TEXT |  |  |  |  |  |
| start_date | 開始日 | DATE |  |  |  |  |  |
| end_date | 終了日 | DATE |  |  |  |  |  |
| total_team_size | 規模（全体人数） | VARCHAR(100) |  |  |  |  | 幅がある可能性もあるので自由記述 |
| team_size | 規模（チーム人数） | VARCHAR(100) |  |  |  |  | 幅がある可能性もあるので自由記述 |
| ※ projectテーブル（プロジェクト経歴）: duration_months（期間月数）は開始日・終了日から算出するため列としては持たない。 |  |  |  |  |  |  |  |

## 17_project_role_link

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | ID | SERIAL | ○ |  |  | ○ |  |
| project_id | プロジェクトID | INT |  | ○ | ○＊ | ○ | projectテーブル参照 |
| project_role_id | 役割ID | INT |  | ○ | ○＊ | ○ | project_roleテーブル参照 |
| ※ project_role_linkテーブル（プロジェクト-役割 中間テーブル）: 元資料のテーブル名projects_role_link・カラム名project_irole_idのタイプミスを修正。＊UNIQUE(project_id, project_role_id)。 |  |  |  |  |  |  |  |

## 18_project_detail

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | 詳細ID | SERIAL | ○ |  |  | ○ |  |
| project_id | プロジェクトID | INT |  | ○ | ○ | ○ | projectテーブル参照（1対1） |
| overview | 業務詳細（概要） | VARCHAR(300) |  |  |  |  |  |
| research_analysis | 業務詳細（調査分析） | BOOLEAN |  |  |  |  | true:対応あり、false:対応なし |
| requirements_definition | 業務詳細（要件定義） | BOOLEAN |  |  |  |  | true:対応あり、false:対応なし |
| basic_design | 業務詳細（基本設計） | BOOLEAN |  |  |  |  | true:対応あり、false:対応なし |
| detailed_design | 業務詳細（詳細設計） | BOOLEAN |  |  |  |  | true:対応あり、false:対応なし |
| development | 業務詳細（製造） | BOOLEAN |  |  |  |  | true:対応あり、false:対応なし |
| testing | 業務詳細（テスト） | BOOLEAN |  |  |  |  | true:対応あり、false:対応なし |
| operation | 業務詳細（運用） | BOOLEAN |  |  |  |  | true:対応あり、false:対応なし |

## 19_project_skill_link

| 物理名 | 論理名 | 型 | PK | FK | UK | NOT NULL | 説明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| id | プロジェクトスキルID | SERIAL | ○ |  |  | ○ |  |
| project_id | プロジェクトID | INT |  | ○ | ○＊ | ○ | projectテーブル参照 |
| skill_id | スキルID | INT |  | ○ | ○＊ | ○ | skillテーブル参照 |
| skill_version_id | スキルバージョンID | INT |  | ○ | ○＊ |  | skill_versionテーブル参照（NULL可） |
| ※ project_skill_linkテーブル（プロジェクト-スキル 中間テーブル）: ＊UNIQUE(project_id, skill_id, skill_version_id)。 |  |  |  |  |  |  |  |

## 20_ER図

**ER図（テーブル関連の全体像）**

| 凡例: 1＝一、N＝多（例: 1─N は一対多）。詳細な設計判断（権限判定ロジック・論理削除の運用方針等）は docs/design/data-model.md を参照。 |  |  |  |
| --- | --- | --- | --- |
| 起点テーブル | 関係 | 終点テーブル | 備考 |
| employee | 1─1 | user |  |
| employee | N─1 | department |  |
| employee | 1─N | employee_skill_link |  |
| employee_skill_link | N─1 | skill |  |
| skill | 1─N | skill_version |  |
| employee | 1─N | employee_certification_link |  |
| employee_certification_link | N─1 | certification |  |
| certification | N─1 | certification_category |  |
| employee | 1─N | project |  |
| project | 1─1 | project_detail |  |
| project | 1─N | project_role_link |  |
| project_role_link | N─1 | project_role |  |
| project | 1─N | project_skill_link |  |
| project_skill_link | N─1 | skill |  |
| employee | N─1 | station |  |
| station | N─N | railway_line | station_line_link 経由 |
| skill | N─1 | skill_category |  |
