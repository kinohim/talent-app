> **【更新】このドラフトはPython/Django前提で書かれた初期案です。技術スタックはNext.js(TypeScript)+PostgreSQLに決定しました（`docs/decisions/0001-tech-stack.md`参照）。**
> **最新の設計は `docs/requirements/requirements.md`（要件）、`docs/design/data-model.md`（DB設計）、`docs/design/screens.md`（画面設計）を参照してください。本ファイルは検討経緯の記録として残します。**

# タレントマネジメントアプリ 基本設計書（ドラフト）

## 1. 概要

### 1.1 目的
社員の基本情報・スキル・資格・プロジェクト経歴を一元管理し、検索・可視化できる個人学習用アプリケーションを構築する。

### 1.2 スコープ（MVP）
以下の機能を第一段階の対象とする。認証・プロジェクト経歴・資格管理は次段階（フェーズ2）とする。

| フェーズ | 機能 |
|---|---|
| フェーズ1(MVP) | 社員管理（CRUD）、スキルカテゴリ管理（CRUD）、スキル管理（CRUD）、社員スキル紐付け（CRUD） |
| フェーズ2 | ログイン認証、資格管理、プロジェクト経歴管理 |
| フェーズ3 | 検索・絞り込み強化、ダッシュボード/レポート |

## 2. 技術構成

| 項目 | 内容 |
|---|---|
| 言語/フレームワーク | Python 3.12 / Django 6.0 |
| DB | SQLite（開発時）→ PostgreSQL（本運用想定時） |
| 実行環境 | WSL2 (Ubuntu 24.04) |
| フロントエンド | Djangoテンプレート（サーバーサイドレンダリング） |

## 3. 機能一覧（フェーズ1）

| No | 機能名 | 概要 |
|---|---|---|
| F-01 | 社員一覧・検索 | 社員を一覧表示し、氏名等で検索する |
| F-02 | 社員登録 | 新しい社員情報を登録する |
| F-03 | 社員更新 | 既存の社員情報を編集する |
| F-04 | 社員削除 | 社員情報を削除する（論理削除） |
| F-05 | スキルカテゴリ一覧・検索 | スキルカテゴリを一覧表示・検索する |
| F-06 | スキルカテゴリ登録/更新/削除 | カテゴリのCRUD |
| F-07 | スキル一覧・検索 | スキルをカテゴリ別に一覧表示・検索する |
| F-08 | スキル登録/更新/削除 | スキルのCRUD |
| F-09 | 社員スキル紐付け | 社員ごとにスキルと習熟度を登録・編集する |

## 4. テーブル定義（ER概要）

```
SkillCategory (スキルカテゴリマスタ)
  └─ Skill (スキルマスタ) [FK: skill_category_id]
       └─ EmployeeSkillLink (社員スキル中間テーブル) [FK: skill_id]
Employee (社員マスタ)
  └─ EmployeeSkillLink [FK: employee_id]
```

### 4.1 共通カラム（全テーブル共通・抽象クラス）
| カラム名 | 型 | 説明 |
|---|---|---|
| created_at | DateTime | 作成日時 |
| created_by | Char(100) | 作成者 |
| updated_at | DateTime | 更新日時 |
| updated_by | Char(100) | 更新者 |
| deleted_at | DateTime | 削除日時（論理削除） |
| deleted_by | Char(100) | 削除者 |

### 4.2 SkillCategory（スキルカテゴリマスタ）
| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| skill_category_id | AutoField | PK | カテゴリID |
| skill_category_name | Char(100) | NOT NULL | カテゴリ名 |

### 4.3 Skill（スキルマスタ）
| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| skill_id | AutoField | PK | スキルID |
| skill_category_id | FK → SkillCategory | NOT NULL | カテゴリ |
| skill_name | Char(100) | NOT NULL | スキル名 |

### 4.4 Employee（社員マスタ）
| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| employee_id | Char(6) | PK | 社員ID |
| employee_name | Char(100) | NOT NULL | 氏名 |
| birth_date | Date | NULL可 | 生年月日 |
| gender | Char(1) | 選択肢(1:男性/2:女性/3:その他) | 性別 |
| experience_years | Integer | NULL可 | 経験年数 |
| career_summary | Text | NULL可 | 経歴概要 |
| self_pr | Text | NULL可 | 自己PR |

### 4.5 EmployeeSkillLink（社員スキル中間テーブル）
| カラム名 | 型 | 制約 | 説明 |
|---|---|---|---|
| employee_skill_link_id | AutoField | PK | ID |
| employee_id | FK → Employee | NOT NULL | 社員 |
| skill_id | FK → Skill | NOT NULL | スキル |
| skill_level | Char(1) | 選択肢(1:△/2:〇/3:◎) | 習熟度 |
| unique制約 | (employee_id, skill_id) | | 同一社員・同一スキルの重複禁止 |

## 5. 画面一覧（フェーズ1）

| 画面ID | 画面名 | URL | 説明 |
|---|---|---|---|
| S-01 | 社員一覧 | /employees | 検索条件付き一覧 |
| S-02 | 社員登録/編集 | /employees/create, /employees/update | フォーム入力 |
| S-03 | スキルカテゴリ一覧 | /skill_categories | 検索条件付き一覧 |
| S-04 | スキルカテゴリ登録/編集 | /skill_categories/create, /skill_categories/update | フォーム入力 |
| S-05 | スキル一覧 | /skills | カテゴリ別一覧・検索 |
| S-06 | スキル登録/編集 | /skills/create, /skills/update | フォーム入力 |
| S-07 | 社員スキル編集 | /employees/{id}/skills | 社員詳細内でスキル紐付け |

## 6. 未確定事項（要相談）
- 社員IDの発番ルール（連番か、部署コード等を含む形式か）
- 論理削除としたデータの一覧表示への出し方（非表示にするか、フィルタ切替にするか）
- 本運用を想定するか、学習用として割り切るか（PostgreSQL移行やDocker化のタイミング）
