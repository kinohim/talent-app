# スキーマ定義

全16テーブル。命名規則: スネークケース。**サロゲートキーのPKはカラム名`id`（SERIAL）で統一する**。例外はemployeeのみ: 業務上の社員ID（VARCHAR(6)、管理職採番）をそのままPKとするため`employee_id`。FKカラム名は`<参照先テーブル名>_id`とする（例: `skill_id`は`skill.id`を参照）。全テーブル共通で以下のシステムカラムを持つ（以下、各テーブル定義では省略）。

```
created_at, created_by, created_program,
updated_at, updated_by, updated_program,
deleted_at, deleted_by, deleted_program   -- 論理削除。NULL=有効、日付あり=削除済
```
---

## organization_unit（組織単位マスタ：事業部／部署／Gr）

自己参照テーブルで3階層（事業部＞部署＞Gr）を表現する。社員はいずれの階層にも所属できる。

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| parent_id | INT | FK→organization_unit.id, NULL可 | 事業部の場合はNULL |
| unit_name | VARCHAR(100) | NOT NULL | 例：システム事業部、開発部、第一Gr |
| unit_level | ENUM | NOT NULL | 1:事業部, 2:部署, 3:Gr |

- 事業部（unit_level=1）はMST004画面の専用フォームからのみ追加できる。
- 部署・Gr（unit_level=2,3）は一覧の該当行から「配下に追加」して作成する。
- 配下に子が存在する行、または所属社員（`employee.organization_unit_id`からの参照）が存在する行は削除不可。

---

## employee（社員基本情報）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| employee_id | VARCHAR(6) | PK | 管理職が新規登録時に採番 |
| is_registered | BOOLEAN | NOT NULL, DEFAULT FALSE | 初期登録完了フラグ。EDT001完了でTRUEに更新 |
| employment_status | ENUM | NOT NULL, DEFAULT 1 | **1:現職, 2:退職**。退職判定はこのカラムで行う |
| organization_unit_id | INT | FK→organization_unit.id, NULL可 | 事業部／部署／Grいずれかの行を指す |
| name | VARCHAR(50) | NULL可 | 初期登録前はNULL。SSOの表示名を初期値に設定 |
| name_kana | VARCHAR(50) | NULL可 | 初期登録前はNULL |
| birth_date | DATE | | |
| gender | ENUM | | 1:男性, 2:女性, 3:その他 |
| hire_date | DATE | | 入社年月日。本人（または管理職）が基本情報編集（EDT001）で直接入力する |
| career_summary | TEXT | | |
| self_pr | TEXT | | |
| nearest_station_line | VARCHAR(100) | | 自由記述。例：JR山手線 |
| nearest_station_name | VARCHAR(100) | | 自由記述。例：渋谷駅 |
| final_school_name | VARCHAR(100) | | 自由記述 |
| final_department_name | VARCHAR(100) | | 自由記述（学部・学科名） |
| final_school_type | ENUM | | 1:高校, 2:専門学校, 3:短大, 4:大学, 5:大学院 |
| graduation_year_month | DATE | | YYYYMM01形式で保存 |
| graduation_status | ENUM | | 1:卒業, 2:中退 |

---

## user_account（ログインアカウント）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| employee_id | VARCHAR(6) | FK→employee.employee_id, UK, NOT NULL | 1社員1アカウント |
| email | VARCHAR(100) | UK, NOT NULL | 会社メールアドレス。管理職が事前登録し、ログイン時の照合キーとして使う（プロバイダ問わず） |
| external_id | VARCHAR(255) | UK, NULL可 | Azure AD/Google/GitHubいずれかの外部ID。初回ログイン時にNULLから確定値へ更新 |
| auth_provider | ENUM | NULL可 | azure_ad / google / github。初回ログイン時に確定 |
| role | ENUM | NOT NULL | 1:一般社員, 2:人事・営業, 3:管理職 |
| last_login_at | TIMESTAMP | | |

**ログイン判定ロジック**:
1. 選択したプロバイダ（Azure AD/Google/GitHub）で認証し、確認済みメールアドレスを取得する
2. そのメールアドレスで`user_account.email`を検索
3. 該当レコードなし → 「未登録」エラー（プロバイダ側の確認済みメールが事前登録メールと一致しない場合もこれに該当。例：GitHub個人アカウントで会社メールと紐付いていない場合）
4. 該当employeeの`employment_status = 2（退職）` → 「無効化済み」エラー
5. 該当あり・現職 → `external_id`がNULLなら今回の値と`auth_provider`を確定（初回ログイン）。遷移先はロールにより異なる: 一般社員／管理職は`is_registered=false`ならEDT001（初回登録）へ、trueならREF001（トップ）へ。**人事・営業は経歴書を作成しないため常にREF001へ直行し、初回ログイン成立時に`is_registered`を自動でTRUE、`name`にSSO表示名を設定する**
6. 2回目以降のログインで、認証に使われたプロバイダが登録済みの`auth_provider`と異なる場合（メールは一致するが`external_id`が不一致の場合を含む）は、ログインさせず「プロバイダ不一致」エラーを表示する（AUTH001参照）。途中でのプロバイダ変更は非対応

---

## skill_category（スキルカテゴリマスタ）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| skill_category_name | VARCHAR(100) | NOT NULL | MST001で管理。certification_categoryとは独立 |

## skill（スキルマスタ）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| skill_category_id | INT | FK→skill_category.id, NOT NULL | |
| skill_name | VARCHAR(100) | UK, NOT NULL | カテゴリをまたいでもシステム全体でユニーク |
| has_version | BOOLEAN | NOT NULL, DEFAULT FALSE | バージョン管理有無。MST001でバージョンを1件以上登録すると自動でTRUE |

## skill_version（スキルバージョンマスタ）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| skill_id | INT | FK→skill.id, NOT NULL | |
| version_name | VARCHAR(50) | NOT NULL | 8, 11, 17 等 |
| is_active | BOOLEAN | NOT NULL, DEFAULT TRUE | 選択肢から外す場合はFALSE |
| display_name | VARCHAR(100) | | 自動生成: skill_name + version_name |

## employee_skill（社員-スキル中間）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| employee_id | VARCHAR(6) | FK→employee.employee_id, NOT NULL | |
| skill_id | INT | FK→skill.id, NOT NULL | |
| skill_version_id | INT | FK→skill_version.id, **NULL可** | NULL=バージョン管理なし |
| skill_level | ENUM | NOT NULL | 1:◎, 2:○, 3:△ |

- 複合ユニーク: `employee_id + skill_id + skill_version_id`（`UNIQUE NULLS NOT DISTINCT`）。`skill_version_id=NULL`が「バージョン管理なし」を表し、同じ社員・スキルでNULLは1件のみ許容。

---

## certification_category（資格カテゴリマスタ）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| certification_category_name | VARCHAR(100) | NOT NULL | MST002で管理。skill_categoryとは独立 |

## certification（資格マスタ）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| certification_category_id | INT | FK→certification_category.id, NOT NULL | |
| certification_name | VARCHAR(100) | UK, NOT NULL | カテゴリをまたいでもシステム全体でユニーク |
| certification_organization | VARCHAR(100) | NOT NULL | 例：IPA |

## employee_certification（社員-資格中間）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| employee_id | VARCHAR(6) | FK→employee.employee_id, NOT NULL | |
| certification_id | INT | FK→certification.id, NOT NULL | |
| acquired_date | DATE | NOT NULL | |
| expiration_date | DATE | NULL可 | |

- 同じ資格を再取得した場合は新規レコードとして追加する（更新ではなく追加）。

---

## site（現場マスタ）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| site_name | VARCHAR(100) | UK, NOT NULL | MST005で管理。システム全体でユニーク |
| nearest_station_id | INT | FK→station.id, NULL可 | MST005で管理（2026-07追加）。employeeの最寄駅と同じstationマスタを参照 |
| address | VARCHAR(255) | NULL可 | MST005で管理（2026-07追加）。自由記述 |

## project（プロジェクト経歴）

**社員1人の経歴レコード**であり、プロジェクトという実体の共有マスタではない。同じ現場・同じ案件に複数人が配属された場合も、社員ごとに別レコードを作成する（現場の共有情報はsiteマスタが担う）。したがってproject_detailとの1対1(UK)は「1つの経歴レコードに業務詳細は1件」という意味であり、複数人配属とは干渉しない。

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| employee_id | VARCHAR(6) | FK→employee.employee_id, NOT NULL | |
| site_id | INT | FK→site.id, NOT NULL | siteマスタから選択 |
| project_title | VARCHAR(100) | NOT NULL | |
| industry | VARCHAR(100) | | 自由記述。例：金融派生商品 |
| project_summary | TEXT | | |
| start_date | DATE | NOT NULL | |
| end_date | DATE | NULL可 | NULL=現在進行中 |
| total_team_size | VARCHAR(100) | | 自由記述（"約50名"等の幅表現を許容）。画面上の入力上限は20文字（EDT005）。DB側は余裕を持たせている |
| team_size | VARCHAR(100) | | 自由記述。同上（画面上限20文字） |

## project_role（現場ポジションマスタ）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| project_role_name | VARCHAR(20) | UK, NOT NULL | SE, PG, リーダー 等。MST003で管理。システム全体でユニーク |

## project_role_link（プロジェクト-役割中間）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| project_id | INT | FK→project.id, NOT NULL | |
| project_role_id | INT | FK→project_role.id, NOT NULL | |

- 複合ユニーク: `project_id + project_role_id`。同一プロジェクトへの同一役割の重複登録を防ぐ。

## project_detail（プロジェクト業務詳細）

projectと**1対1**（1プロジェクトにつき業務詳細は1レコード）。1対1を保証するため`project_id`にユニーク制約を付ける。

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| project_id | INT | FK→project.id, **UK**, NOT NULL | 1対1を保証するユニーク制約 |
| overview | VARCHAR(300) | | 業務詳細概要 |
| research_analysis | BOOLEAN | | 調査分析 |
| requirements_definition | BOOLEAN | | 要件定義 |
| basic_design | BOOLEAN | | 基本設計 |
| detailed_design | BOOLEAN | | 詳細設計 |
| development | BOOLEAN | | 製造 |
| testing | BOOLEAN | | テスト |
| operation | BOOLEAN | | 運用 |

## project_skill（プロジェクト-スキル中間）

| 列名 | 型 | 制約 | 説明 |
|---|---|---|---|
| id | SERIAL | PK | |
| project_id | INT | FK→project.id, NOT NULL | |
| skill_id | INT | FK→skill.id, NOT NULL | |
| skill_version_id | INT | FK→skill_version.id, NULL可 | 該当時のみ |

- 複合ユニーク: `project_id + skill_id + skill_version_id`（`UNIQUE NULLS NOT DISTINCT`）。employee_skillと同方針で、同一プロジェクトへの同一スキル（同一バージョン）の重複登録を防ぐ。

---

## 命名・制約の一般ルール

- カテゴリマスタ（skill_category, certification_category）は`id`のみをPKとし、区分コード（01,02...）のような別カラムは持たない。
- スキル名・資格名・現場ポジション名・現場名はいずれもシステム全体でユニーク（カテゴリをまたいでも重複不可）。
- 論理削除（`deleted_at`）は全テーブル共通。物理削除は行わない。社員の退職判定には使わず、`employee.employment_status`を使う。
- **親レコードを論理削除する場合、従属する子レコードも同一トランザクションで論理削除する**（例: projectを削除したら、そのproject_detail・project_skill・project_role_linkも同時に論理削除）。子だけが有効なまま残る「宙に浮いた」状態を作らない。
- **マスタ行（skill・skill_version・certification・site・project_role・各カテゴリ・organization_unit）は、他レコードから参照されている間は削除不可**。削除操作時は参照の有無をチェックし、参照があればエラー「使用中のため削除できません」を表示する（CMN001参照）。参照がなくなれば削除できる。
