# データモデル設計

元資料 `30_設計/DB設計.csv` をベースに、Next.js + Prisma + PostgreSQL 構成向けに整理したもの。

## 元資料からの主な変更点

- Django/Python前提の記述（プログラム名を記録する`created_program`等）は、Next.jsのAPI設計とは相性が悪いため`created_by`/`updated_by`/`deleted_by`のみに簡略化した
- PK/FKの重複定義（`skill_category`や`certification_category`でIDが2つPK指定されていた等）を単一の連番PKに統一し、業務コード（01, 02…）は`code`列としてユニーク制約に変更した
- テーブル名・カラム名のタイプミスを修正（`projects_role_link`→`project_role_link`、`project_irole_id`→`project_role_id`）
- `loginUser`テーブルが2案併記されていたため1つに統合し、`User`（認証情報）と`Employee`（経歴書データ）を分離した
- 命名はPrisma慣習に合わせてキャメルケースのモデル名・スネークケースのカラムは自動生成に任せる想定

## 共通カラム（全テーブル）

| カラム | 型 | 説明 |
|---|---|---|
| createdAt | DateTime | 作成日時 |
| createdBy | String | 作成者 |
| updatedAt | DateTime | 更新日時 |
| updatedBy | String | 更新者 |
| deletedAt | DateTime? | 削除日時（NULL=有効データ、論理削除） |
| deletedBy | String? | 削除者 |

## テーブル一覧

### User（認証・アカウント）

認証はAzure AD（Microsoft Entra ID）に委譲するため、パスワード関連カラム（`passwordHash`/`passwordResetToken`/`passwordResetExpiresAt`）と`username`は廃止した（ADR `0007-screen-list-pdf-adoption.md`）。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | Int | PK | |
| employeeId | String | FK→Employee, UNIQUE | 1対1で紐付け |
| email | String | UNIQUE, NOT NULL | Azure ADとの照合キー。EDT006で事前登録 |
| role | Enum(GENERAL, MANAGER, HR_SALES, ADMIN) | NOT NULL | 一般／管理職／人事・営業／システム管理者の4階層（ADR `0008`）。権限マトリクスは要件定義書3.1参照 |
| isActive | Boolean | NOT NULL, default true | アカウント状態。退職・無効化（EDT007）でfalse。falseのアカウントはログイン不可（AUTH001でエラー表示） |
| lastLoginAt | DateTime? | | |

### Department（組織マスタ：事業部＞部署＞Gr）

管理職の編集範囲を「自部署のみ」とする決定（ADR `0002`）で追加し、画面一覧PDF準拠の決定（ADR `0007`）で**3階層（事業部＞部署＞Gr）の自己参照ツリー**に拡張した。

| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| id | Int | PK | |
| code | String | UNIQUE | 組織コード |
| departmentName | String | NOT NULL | 組織名 |
| orgLevel | Enum(DIVISION, DEPARTMENT, GROUP) | NOT NULL | DIVISION:事業部, DEPARTMENT:部署, GROUP:Gr |
| parentId | Int? | FK→Department | 親組織。事業部はNULL、部署は事業部、Grは部署を親に持つ |

- MST004（部署マスタ管理）で階層ごと管理する。追加ボタンは事業部専用、部署・Grは一覧から配下に追加（`docs/design/screens.md`）
- 個人単位の上長関係（誰が誰の直属の上司か）は持たない。閲覧・編集の権限判定は「部署（DEPARTMENT）レベルの組織単位の一致」で行う（後述「権限判定ロジック」、ADR `0008`）

### Employee（経歴書）
| カラム | 型 | 制約 | 説明 |
|---|---|---|---|
| employeeId | String(6) | PK | 社員ID。発番は単純連番・6桁ゼロ埋め（例: `000001`）に決定（ADR `0003-employee-id-format.md`） |
| name | String | NOT NULL | |
| nameKana | String | NOT NULL | |
| birthDate | Date? | | |
| gender | Enum(MALE, FEMALE, OTHER) | | |
| departmentId | Int? | FK→Department | 所属組織（通常はGrまたは部署レベル）。閲覧・編集の権限判定に使用（ADR `0008`）。異動履歴は持たず現在の所属のみ保持（MVP割り切り）。値は管理者のみが編集可（詳細は`docs/design/detailed-design.md`の画面項目定義参照） |
| nearestStationId | Int? | FK→Station | |
| experienceYears | Int? | | |
| careerSummary | Text? | | |
| selfPr | Text? | | |
| finalSchoolName | String? | | |
| finalDepartmentName | String? | | |
| finalSchoolType | Enum(HIGH_SCHOOL, VOCATIONAL, JUNIOR_COLLEGE, UNIVERSITY, GRAD_SCHOOL) | | |
| graduationYearMonth | Date? | | YYYYMM01形式 |
| graduationStatus | Enum(GRADUATED, WITHDREW) | | |

### RailwayLine / Station / StationLineLink（駅・路線マスタ）
- `RailwayLine`: id, lineName
- `Station`: id, stationName
- `StationLineLink`: id, lineId(FK), stationId(FK)、UNIQUE(lineId, stationId)

### SkillCategory / Skill / SkillVersion（スキルマスタ）
- `SkillCategory`: id(PK), code(UNIQUE, 例 01/02…), categoryName
- `Skill`: id(PK), categoryId(FK), skillName, hasVersion(Boolean)
- `SkillVersion`: id(PK), skillId(FK), versionName, versionOrder, releaseDate, isActive, displayName（自動生成: skillName + versionName）

### EmployeeSkillLink（社員-スキル）
id(PK), employeeId(FK), skillId(FK), skillVersionId(FK, nullable), skillLevel(Enum: LOW, MID, HIGH)、UNIQUE(employeeId, skillId, skillVersionId)

### CertificationCategory / Certification（資格マスタ）
- `CertificationCategory`: id(PK), code(UNIQUE, 例 10:IT系/20:語学系/30:業務系), categoryName, description
- `Certification`: id(PK), categoryId(FK), certificationName, certificationOrganization

### EmployeeCertificationLink（社員-資格）
id(PK), employeeId(FK), certificationId(FK), acquiredDate, expirationDate
※同じ資格を再取得するケースを考慮し、UNIQUE制約は付けない（履歴として複数行許容）

### ProjectRole（現場ポジション／役割マスタ）
id(PK), roleName（SE, PG, リーダー, サブリーダー等）
※「現場ポジション管理」機能はこのマスタのCRUDを指す（確認済み）

### Site（現場マスタ）★新規（ADR `0007`。MST005で管理）
id(PK), siteName（現場名）
※プロジェクト経歴で使用する現場を自由記述からマスタ参照に変更。「過去にどの現場に誰がいたか」の横断検索（REF002）の基盤となる

### Project（プロジェクト経歴）
id(PK), employeeId(FK), siteId(FK→Site), projectTitle, projectSummary, startDate, endDate, totalTeamSize, teamSize
※`siteName`（自由記述）は`siteId`（現場マスタ参照）に変更（ADR `0007`）
※`duration_months`は開始日・終了日から算出するため列としては持たない
※役割（role）は`ProjectRoleLink`で`ProjectRole`マスタに紐付ける形に統合済みのため、本テーブルに`role`列は持たない

### ProjectRoleLink
id(PK), projectId(FK), projectRoleId(FK)、UNIQUE(projectId, projectRoleId)

### ProjectDetail（プロジェクト詳細・業務工程）
id(PK), projectId(FK, UNIQUE), overview, researchAnalysis(Boolean), requirementsDefinition(Boolean), basicDesign(Boolean), detailedDesign(Boolean), development(Boolean), testing(Boolean), operation(Boolean)

### ProjectSkillLink
id(PK), projectId(FK), skillId(FK), skillVersionId(FK, nullable)、UNIQUE(projectId, skillId, skillVersionId)

## ER概要

```
Employee 1─1 User
Employee N─1 Department（自己参照ツリー: 事業部＞部署＞Gr）
Employee 1─N EmployeeSkillLink N─1 Skill 1─N SkillVersion
Employee 1─N EmployeeCertificationLink N─1 Certification N─1 CertificationCategory
Employee 1─N Project 1─1 ProjectDetail
Project N─1 Site
Project 1─N ProjectRoleLink N─1 ProjectRole
Project 1─N ProjectSkillLink N─1 Skill
Employee N─1 Station N─N RailwayLine（StationLineLink経由）
Skill N─1 SkillCategory
```

## 権限判定ロジック（データモデル観点）

要件定義書3.1の権限マトリクス（4ロール、ADR `0008`）をデータモデルに落とすと以下になる。API・画面側の実装詳細は`docs/design/detailed-design.md`参照。

### 部署レベルの解決（`deptOf`）

組織が3階層のため、判定の前に所属組織を「部署（DEPARTMENT）」レベルに解決する。

- `deptOf(employee)`: `employee.departmentId`の組織から`parentId`を祖先方向にたどり、最初に見つかる`orgLevel = DEPARTMENT`の組織IDを返す（所属自体が部署ならそのID）。見つからない場合（未設定・事業部直属）は`null`

### 閲覧（経歴書詳細 REF003）

| ロール | 閲覧可能な対象 | 判定方法 |
|---|---|---|
| GENERAL | 本人＋同じ部署のEmployee | `session.employeeId === target.employeeId` または `deptOf(session) !== null && deptOf(session) === deptOf(target)` |
| MANAGER / HR_SALES / ADMIN | 全Employee | 常にtrue |

- **経歴書一覧（REF002）の検索はロールによらず全Employeeが対象**（他部署も結果に表示する。ADR `0008`）。GENERALに対しては行ごとに閲覧可否（`canViewDetail`）を返し、詳細への遷移を制御する

### 編集

| ロール | 編集可能な対象 | 判定方法 |
|---|---|---|
| GENERAL / HR_SALES | 自分自身のEmployeeのみ | `session.employeeId === target.employeeId` |
| MANAGER | 自分と同じ部署のEmployee全員（自分含む） | `deptOf(session) !== null && deptOf(session) === deptOf(target)` |
| ADMIN | 全Employee | 常にtrue |

- `deptOf`が`null`になる社員（所属未設定等）は、GENERALからの閲覧対象外・MANAGERからの編集対象外とする（本人とADMIN、閲覧はMANAGER/HR_SALESも可）。安全側に倒す割り切り
- この判定はAPI側（サーバー）で必ず行い、フロントの表示制御はUXのための補助とする（詳細設計書の「権限チェック」節参照）
- `deptOf(session)`はログイン時に解決してセッションに保持し、毎リクエストのツリー探索を避ける（所属変更時はセッション再発行）

## 実装メモ

- Prismaでこのモデルをそのままschema.prismaに落とし込める粒度で書いた
- 論理削除は`deletedAt`で判定し、データ更新系クエリは`where: { deletedAt: null }`を基本にする。一覧画面での表示/非表示は「デフォルト非表示、フィルタ切替で表示可能」に決定（ADR `0004-soft-delete-list-display.md`）。API側は`includeDeleted`のようなクエリパラメータで切り替えられるようにする
- Enumの日本語表示（管理職/一般ユーザー等）はDB値と画面表示のマッピングをフロント側で持つ
