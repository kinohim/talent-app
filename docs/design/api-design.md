# API設計書

`docs/design/basic-design.md`の外部インターフェース概要を受けて、Next.js API Routesのエンドポイント・共通仕様を定義する。画面ごとの項目定義は`docs/design/detailed-design.md`を参照。画面体系は`01_画面一覧.pdf`準拠（ADR `0007`）、閲覧権限はADR `0008`に従う。

## 1. 共通方針

- ベースパス: `/api`
- 形式: REST風（リソース単位のCRUD）。JSON送受信
- 認証: Auth.js（Microsoft Entra IDプロバイダ）のセッションCookie。未認証リクエストは`401`。Azure ADで認証されたメールアドレスを`User.email`と突合し、未登録・無効化済み（`isActive = false`）はセッションを発行しない
- 認可: 各エンドポイントでロール（GENERAL/MANAGER/HR_SALES/ADMIN）と対象データの所有・部署関係をサーバー側で必ずチェックする（`docs/design/data-model.md`「権限判定ロジック」参照）。権限不足は`403`。**経歴書詳細の閲覧制限（GENERALは自部署のみ）もここで判定する**
- バリデーション: zodでリクエストボディ・クエリパラメータのスキーマを定義し、APIハンドラの先頭でパースする。不正時は`400`
- 論理削除: 更新系は`deletedAt: null`のレコードのみ対象。一覧系は`includeDeleted=true`クエリパラメータで削除済みも含められる（ADR `0004`）
- ページネーション: 一覧系は`page`（1始まり）・`pageSize`（デフォルト20、最大100）のクエリパラメータを共通で持つ。レスポンスは`{ items, total, page, pageSize }`の形

### エラーレスポンス形式（共通）

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": [
      { "field": "name", "message": "氏名は必須です" }
    ]
  }
}
```

| HTTPステータス | code例 | 用途 |
|---|---|---|
| 400 | VALIDATION_ERROR | リクエスト内容の検証エラー |
| 401 | UNAUTHENTICATED | 未ログイン |
| 403 | FORBIDDEN | 権限不足（自部署外の閲覧・編集試行等） |
| 404 | NOT_FOUND | 対象データなし（論理削除済みを含む） |
| 409 | CONFLICT | 一意制約違反等（同一社員・同一スキルの重複登録など） |
| 500 | INTERNAL_ERROR | 想定外のサーバーエラー |

## 2. エンドポイント一覧

### 2.1 認証

| メソッド | パス | 概要 | 権限 |
|---|---|---|---|
| GET | `/api/auth/signin` → Azure ADリダイレクト | ログイン開始（Auth.js標準ルート、AUTH001） | 全員 |
| GET/POST | `/api/auth/callback/microsoft-entra-id` | Azure ADからのコールバック。`User.email`と突合し、未登録・無効化済みはエラー | 全員 |
| POST | `/api/auth/signout` | ログアウト（Auth.js標準ルート） | ログイン済み |

パスワード変更・リセット系のAPIは持たない（Azure AD側で管理、ADR `0007`）。

### 2.2 経歴書（Employee）

| メソッド | パス | 概要 | 権限 |
|---|---|---|---|
| GET | `/api/employees` | 経歴書一覧・横断検索（REF002）。**全ロールとも全社員が検索対象**（他部署も結果に含む、ADR `0008`） | ログイン済み |
| GET | `/api/employees/me` | 自分のプロフィール取得（REF004/REF006） | ログイン済み |
| GET | `/api/employees/[employeeId]` | 指定社員の経歴書詳細取得（REF003/REF005） | 閲覧権限（GENERALは自部署のみ、他ロールは全社員）。権限外は`403` |
| PATCH | `/api/employees/[employeeId]` | 経歴書更新。EDT001〜005の各画面から該当セクションのみ送信する部分更新 | 本人・MANAGER（自部署）・ADMIN |
| DELETE | `/api/employees/[employeeId]` | 論理削除 | ADMIN |

#### `GET /api/employees` の検索クエリパラメータ（REF002）

| パラメータ | 型 | 説明 |
|---|---|---|
| `name` | string | 氏名・カナの部分一致 |
| `departmentId` | number | 所属組織（事業部/部署/Grいずれか。配下組織を含めて検索） |
| `experienceYearsMin` / `experienceYearsMax` | number | 経験年数の範囲 |
| `skillIds` | number[]（カンマ区切り） | スキル絞込み |
| `skillMatch` | `and` \| `or` | スキルのAND/OR指定（デフォルト`or`） |
| `certificationIds` | number[]（カンマ区切り） | 資格絞込み |
| `certificationMatch` | `and` \| `or` | 資格のAND/OR指定（デフォルト`or`） |
| `siteIds` | number[]（カンマ区切り） | 現場絞込み（プロジェクト経歴に該当現場を含む社員、「過去にどの現場に誰がいたか」検索） |
| `includeDeleted` | boolean | 論理削除済みを含める（ADR `0004`） |

レスポンスの各行には一覧表示用の項目（氏名・カナ・所属組織・経験年数・ヒットしたスキル/資格/現場）に加えて`canViewDetail`（boolean）を含める。GENERALのリクエストでは他部署の社員は`canViewDetail: false`となり、フロントは詳細リンクを非活性にする。**一覧行として返す項目は全ロール共通で、経歴書の全項目（生年月日・学歴・自己PR等）は含めない**

#### `PATCH /api/employees/[employeeId]` のセクション部分更新

リクエストボディは`basic`（EDT001）／`summary`（EDT002）／`skills`（EDT003）／`certifications`（EDT004）／`projects`（EDT005）のいずれかのセクションキーのみを含み、未指定のセクションは変更しない。`basic.departmentId`はADMINのみ変更可で、それ以外のロールが送ってもサーバー側で無視する。

### 2.3 ダッシュボード（REF008）

| メソッド | パス | 概要 | 権限 |
|---|---|---|---|
| GET | `/api/dashboard/skills?departmentId=` | 組織単位（事業部/部署/Gr）ごとのスキル保有者数集計＋保有者名一覧 | ログイン済み |
| GET | `/api/dashboard/certifications?departmentId=` | 同、資格の集計＋保有者名一覧 | ログイン済み |

保有者名は全ロールに返すが、各名前に`canViewDetail`を付与し、詳細への遷移可否を制御する（ADR `0008`。REF002と同じ扱い）。

### 2.4 マスタ管理

すべて一覧系は`GET`、登録は`POST`、更新は`PATCH`、論理削除は`DELETE`の共通パターン。更新系の権限はいずれもADMINのみ（一覧・参照系はプルダウン等の参照用途としてログイン済み全員に許可）。

| リソース | ベースパス | 画面 | 備考 |
|---|---|---|---|
| 組織（部署） | `/api/departments` | MST004 | 3階層ツリー（`orgLevel`・`parentId`）。`GET`はツリー構造で返す |
| スキルカテゴリ | `/api/skill-categories` | MST001 | |
| スキル | `/api/skills` | MST001 | `skillVersions`をネストで返す |
| 資格カテゴリ | `/api/certification-categories` | MST002 | |
| 資格 | `/api/certifications` | MST002 | |
| 現場ポジション | `/api/project-roles` | MST003 | フェーズ2 |
| 現場 | `/api/sites` | MST005 | ★新規（ADR `0007`）。フェーズ2 |
| アカウント | `/api/accounts` | REF007/EDT006/EDT007 | アカウントのCRUD。POSTはUser（employeeId, email, role）＋Employee（name, nameKana, departmentId）を同一トランザクションで作成（ADR `0009`）。無効化はPATCHで`isActive: false`。フェーズ2 |
| 駅（参照のみ） | `/api/stations` | EDT001のプルダウン用 | `GET`のみ提供。マスタ管理画面は持たない（ADR `0007`）。データは初期投入スクリプトで整備 |

例: `GET /api/departments`, `POST /api/departments`, `PATCH /api/departments/[id]`, `DELETE /api/departments/[id]`（他マスタも同型）

一覧系のCSV/Excel出力エンドポイントは持たない（ADR `0006-remove-export-feature.md`）。個人経歴書のPDF出力（REF005）はフェーズ2で実現方式決定後にエンドポイントを定義する（サーバーサイド生成の場合は`GET /api/employees/[employeeId]/resume.pdf`を想定）。

## 3. リクエスト/レスポンス例

### 経歴書一覧検索 `GET /api/employees?skillIds=5&siteIds=3&certificationMatch=or`

```json
// response 200（GENERAL・他部署の社員がヒットした場合）
{
  "items": [
    {
      "employeeId": "000123",
      "name": "山田太郎",
      "nameKana": "ヤマダタロウ",
      "department": { "id": 10, "name": "第一開発部" },
      "experienceYears": 8,
      "matchedSkills": ["Java"],
      "matchedSites": ["A社基幹システム刷新"],
      "canViewDetail": false
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 20
}
```

### 経歴書更新（スキルセクション） `PATCH /api/employees/[employeeId]`

```json
// request（EDT003から。skillsセクションのみ送信）
{
  "skills": [{ "skillId": 5, "skillVersionId": null, "skillLevel": "HIGH" }]
}
```

```json
// response 200
{ "employeeId": "000123", "updatedAt": "2026-07-08T09:00:00.000Z" }
```

```json
// response 403（GENERALが他部署の経歴書詳細を取得しようとした場合）
{ "error": { "code": "FORBIDDEN", "message": "同じ部署の社員の経歴書のみ閲覧できます" } }
```

## 4. 未確定事項

- PDF出力（REF005）の実現方式（ブラウザ印刷ベースならAPI不要、サーバーサイド生成ならエンドポイント追加）❓フェーズ2着手時に決定
- Azure ADアプリ登録のリダイレクトURI・環境変数構成は`infra/`整理時に確定
- 初回データ投入はスクリプト直接投入のためAPIは設計しない（ADR `0005`・`0007`）。スクリプト仕様は`docs/design/detailed-design.md`で定義する
