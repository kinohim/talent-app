# 詳細設計書

`docs/design/basic-design.md`・`docs/design/api-design.md`を受けて、実装に着手できる粒度まで仕様を落とし込む。対象はフェーズ1（MVP）画面を中心とする。フェーズ2・3の画面は基本設計・要件定義レベルの情報に留め、着手前にあらためて詳細化する。画面IDは`01_画面一覧.pdf`準拠（ADR `0007`）。

## 1. 認証詳細

- 認証方式: Azure AD（Microsoft Entra ID）へのリダイレクトログイン（AUTH001）。Auth.jsのMicrosoft Entra IDプロバイダを使用する。パスワードは本システムで保持・管理しない（ADR `0007`）
- アカウント突合: Azure ADが返すメールアドレスを`User.email`（EDT006で事前登録）と照合する。該当なし→「アカウントが登録されていません」、`isActive = false`→「このアカウントは無効化されています」をログイン画面に表示し、セッションを発行しない
- セッション戦略: Auth.jsのJWTセッションを採用（DBセッションテーブルは持たない、MVPの実装コスト優先）
- セッションに含める情報: `employeeId`, `role`（GENERAL/MANAGER/HR_SALES/ADMIN）, `departmentId`（所属組織ID）, `resolvedDepartmentId`（部署レベルに解決済みの組織ID。`docs/design/data-model.md`「権限判定ロジック」の`deptOf`をログイン時に解決して保持）。権限判定はこの4つで完結させる
- 所属組織・権限が変更された場合（EDT001/EDT007）はセッションの再発行が必要。MVPでは「次回ログインから反映」の割り切りとし、無効化（`isActive = false`）のみAPI側で毎リクエストDBチェックし即時反映する（ADR `0009`で確定）
- 環境変数: `AUTH_MICROSOFT_ENTRA_ID_ID` / `AUTH_MICROSOFT_ENTRA_ID_SECRET` / `AUTH_MICROSOFT_ENTRA_ID_ISSUER`（テナント）を環境ごとに設定する

## 2. 権限チェックの実装方針

### 2.1 二重チェックの構成

```
[middleware.ts]
  - セッション有無をチェック（未ログイン→/loginへリダイレクト）
  - ロールに応じて/admin配下等へのアクセス可否を大まかに判定（UX目的、抜けがあってもAPI側で防ぐ）

[APIハンドラ]
  - 必ずセッションからrole/departmentId/resolvedDepartmentId/employeeIdを取得し、
    リソースごとの認可関数で最終判定する（閲覧の部署制限を含む）
```

### 2.2 認可関数（疑似コード）

```ts
// 部署レベルの組織ID。Employeeの所属から解決済みの値（nullあり）
type ResolvedDept = number | null;

function canViewEmployee(session: Session, target: Employee): boolean {
  if (session.employeeId === target.employeeId) return true;
  if (session.role !== "GENERAL") return true; // MANAGER / HR_SALES / ADMIN は全社員閲覧可
  // GENERAL: 部署レベルで一致する場合のみ（ADR 0008）
  const targetDept = resolveDepartment(target.departmentId); // deptOf
  return session.resolvedDepartmentId !== null && session.resolvedDepartmentId === targetDept;
}

function canEditEmployee(session: Session, target: Employee): boolean {
  if (session.role === "ADMIN") return true;
  if (session.role === "MANAGER") {
    const targetDept = resolveDepartment(target.departmentId);
    return session.resolvedDepartmentId !== null && session.resolvedDepartmentId === targetDept;
  }
  // GENERAL / HR_SALES は本人のみ
  return session.employeeId === target.employeeId;
}

function requireAdmin(session: Session): boolean {
  return session.role === "ADMIN";
}
```

- 上記関数は`src/lib/authz.ts`のような共通モジュールに置き、全APIハンドラ・Server Actionから再利用する（実装フェーズでのファイル配置はimpl-agentと合わせる）
- `resolveDepartment`（`deptOf`）: 組織ツリーを祖先方向にたどり最初の`orgLevel = DEPARTMENT`のIDを返す。解決できなければ`null`（GENERALの閲覧対象外・MANAGERの編集対象外になる。安全側の割り切り、`docs/design/data-model.md`参照）
- **経歴書一覧（`GET /api/employees`）は認可で絞り込まない**（全社員が検索対象、ADR `0008`）。代わりにレスポンス各行へ`canViewDetail = canViewEmployee(...)`を付与し、一覧行には経歴書の全項目を含めない（`docs/design/api-design.md`2.2参照）
- REF003/REF005（詳細・プレビュー）およびダッシュボード（REF008）の保有者名リンクは`canViewEmployee`で判定。URL直打ちも`403`で防ぐ

## 3. 画面詳細仕様（フェーズ1）

各画面の入力項目・バリデーション・権限による差異をまとめる。共通ルール: 文字列項目は前後空白をトリムしてから保存、必須項目の未入力は送信前にクライアント側でも警告表示する。

### AUTH001 ログイン (`/login`)

- 入力項目なし。「Microsoftアカウントでログイン」ボタンのみ配置し、Azure ADへリダイレクトする
- コールバックでのアカウント突合エラー（未登録／無効化済み）はこの画面にエラーメッセージ付きで戻す（1章参照）

### REF002 経歴書一覧 (`/resumes`) の検索条件

| 項目 | 型 | 必須 | 備考 |
|---|---|---|---|
| 氏名・カナ | text | 任意 | 部分一致（氏名・カナの両方を対象） |
| 所属組織 | select（組織ツリー） | 任意 | 事業部/部署/Grのいずれを選んでも配下を含めて検索 |
| 経験年数 | number（下限・上限） | 任意 | 範囲指定 |
| スキル | 複数select＋AND/OR切替 | 任意 | |
| 資格 | 複数select＋AND/OR切替 | 任意 | |
| 現場 | 複数select | 任意 | プロジェクト経歴に該当現場を含む社員を検索（「過去にどの現場に誰がいたか」） |
| 削除済みを表示 | checkbox | - | ADR `0004` |

- 検索結果は全社員が対象（他部署も表示、ADR `0008`）。一覧行: 氏名・カナ・所属組織・経験年数・ヒットしたスキル/資格/現場
- `canViewDetail: false`の行は詳細リンクを非活性にし、ツールチップ等で「他部署の経歴書詳細は閲覧できません」と表示する

### EDT001〜EDT005 経歴書編集（セクション別）

対象: 本人／MANAGER（自部署）／ADMIN。フォームコンポーネントは本人編集・他社員編集で共通化する。

#### EDT001 基本情報登録

| 項目 | 型 | 必須 | バリデーション | 編集可能ロール |
|---|---|---|---|---|
| 氏名 | text | ○ | 100文字以内 | 本人／MANAGER（自部署）／ADMIN |
| カナ | text | ○ | 100文字以内、カタカナのみ | 同上 |
| 生年月日 | date | 任意 | 未来日不可 | 同上 |
| 性別 | select | 任意 | MALE/FEMALE/OTHER | 同上 |
| 所属組織 | select（組織ツリー） | 任意 | 存在する`departmentId`のみ | **ADMINのみ**（MANAGER・本人は読み取り専用表示） |
| 最寄り駅 | select（駅マスタ） | 任意 | 存在する`stationId`のみ | 本人／MANAGER（自部署）／ADMIN |
| 経験年数 | number | 任意 | 0以上100以下の整数 | 同上 |
| 最終学歴（学校名／学部／区分／卒業年月／卒業状況） | 各種 | 任意 | 卒業年月は`YYYY-MM`形式 | 同上 |

#### EDT002 経歴概要・自己PR登録

| 項目 | 型 | 必須 | バリデーション |
|---|---|---|---|
| 経歴概要 | textarea | 任意 | 2000文字以内 |
| 自己PR | textarea | 任意 | 2000文字以内 |

#### EDT003 スキル登録

| 項目 | 型 | 必須 | バリデーション |
|---|---|---|---|
| 保有スキル（複数、上限なし） | スキル選択＋バージョン＋習熟度 | 任意 | 同一`skillId`+`skillVersionId`の重複禁止（一意制約と一致） |

#### EDT004 資格登録

| 項目 | 型 | 必須 | バリデーション |
|---|---|---|---|
| 保有資格（複数） | 資格選択＋取得年月日／有効期限 | 任意 | 取得日 ≤ 有効期限 |

#### EDT005 プロジェクト経歴登録（フェーズ2）

| 項目 | 型 | 必須 | バリデーション |
|---|---|---|---|
| 現場 | select（現場マスタ MST005） | ○ | 存在する`siteId`のみ |
| プロジェクトタイトル／概要 | text/textarea | タイトル○ | タイトル100文字以内 |
| 期間（開始日・終了日） | date | 任意 | 開始日 ≤ 終了日 |
| 役割（複数） | select（現場ポジションマスタ） | 任意 | |
| 規模（全体人数／チーム人数） | text | 任意 | |
| 担当工程 | checkbox群（`ProjectDetail`） | 任意 | |
| 使用スキル（複数） | スキル選択 | 任意 | 同一スキル+バージョンの重複禁止 |

`Project`を配列として動的に追加・削除できるリピーターUIとする（`docs/design/screens.md`参照）。

閲覧専用画面（REF001〜REF008）は入力バリデーションなし。各PATCHはセクション部分更新（`docs/design/api-design.md`2.2参照）。

### MST001 スキルマスタ / MST002 資格マスタ / MST004 部署マスタ（`AdminMasterTable`共通仕様）

| 項目 | 型 | 必須 | バリデーション |
|---|---|---|---|
| コード（該当マスタのみ） | text | ○ | マスタ内でユニーク |
| 名称 | text | ○ | 100文字以内 |
| （スキルのみ）カテゴリ | select＋新規入力 | ○ | `SkillCategory`存在チェック。新規入力時はカテゴリを同時作成 |
| （スキルのみ）バージョン | 複数タグ入力 | - | `SkillVersion`として保存 |
| （資格のみ）カテゴリ・発行団体 | select＋新規入力/text | カテゴリ○／団体は任意 | 資格カテゴリはスキルカテゴリと独立 |
| （部署のみ）階層区分・親組織 | ツリー上の追加位置で自動決定 | ○ | 追加ボタンは事業部専用。部署・Grは一覧（ツリー）から配下に追加（`orgLevel`・`parentId`を自動設定） |

- MST003（現場ポジション）・MST005（現場）はフェーズ2。名称のみの単純マスタとして同じ共通仕様に従う
- 削除操作は共通の削除確認モーダル（CMN001）を経由し、論理削除（`deletedAt`セット）とする。関連データ（例: スキルに紐づく`EmployeeSkillLink`）が存在する場合も削除自体は許可し、参照側は表示時に「（削除済み）」等を付与する方針とする（参照整合性エラーで運用を止めないため）

### CMN001 削除確認モーダル

- 対象の名称と「削除してよいか」の確認文言、キャンセル／削除ボタンを表示する共通コンポーネント
- 削除ボタンは誤操作防止のため危険色（赤系）とし、実行後は一覧を再取得する

## 4. 初回データ投入仕様（スクリプト）

一覧のCSV/Excel出力機能は持たない（ADR `0006-remove-export-feature.md`）。初回データ投入（ADR `0005-csv-import-scope.md`）は**取込画面を持たず、スクリプトによる直接投入に一本化**した（ADR `0007`。旧S-20画面は廃止）。

- 対象: 初回のみ。既存Excel台帳から本システムへのデータ移行専用。運用開始後の継続的な一括更新機能としては提供しない
- ファイル形式: Excel（.xlsx）。シート名は「社員」の1シート構成とする
- 実行方法: 開発者が投入スクリプト（`scripts/import-initial-data.ts`想定）をローカルから実行する。実行結果（行番号・成功/エラー・エラー理由）は標準出力に一覧表示する
- 想定カラム（1行1社員）: 氏名, カナ, 生年月日, 性別, 部署コード, 最寄り駅名, 経験年数, 経歴概要, 自己PR, 保有スキル（カンマ区切り、`スキル名:習熟度`形式）, 保有資格（カンマ区切り）, メールアドレス（Azure AD照合キー）, 権限
- 社員IDはファイルに含めず、取込時に単純連番で自動採番する（ADR `0003-employee-id-format.md`）
- 部署コードは事前に部署マスタ（MST004）へ登録済みであることを前提とし、未登録コードを含む行はエラーとする。駅・路線・現場等の参照マスタも同様に事前投入する
- 取込方式はall-or-nothing（全件成功 or 全体中断）とする。いずれかの行でバリデーションエラーが発生した場合は取込全体を中断し、エラー内容（行番号・理由）を出力する。部分成功時のロールバック処理などの複雑な制御は持たない（MVPの割り切り、ADR `0005`参照）

## 5. エラーハンドリング方針（フロント）

- APIエラーは`docs/design/api-design.md`の共通形式（`error.code`/`message`/`details`）を受け取り、`details`があればフォームの該当フィールド下にインラインでエラーメッセージを表示する
- `details`がない一般エラー（403/404/500等）はトースト通知で`error.message`を表示する。閲覧権限エラー（403）は「同じ部署の社員の経歴書のみ閲覧できます」の文言を使う
- フォームの入力チェックはクライアント側（zod schemaをフロント・API双方で共有）でも行い、サーバーへの往復を減らす。ただし最終判定は必ずサーバー側で行う（クライアント側チェックはUX目的のみ）

## 6. DB物理設計補足

- 検索・絞り込みに使う列にはインデックスを張る: `Employee.name`, `Employee.nameKana`, `Employee.departmentId`, `EmployeeSkillLink.skillId`, `EmployeeCertificationLink.certificationId`, `Project.siteId`（現場検索用）, `Department.parentId`（ツリー探索用）
- 一意制約の再確認（`docs/design/data-model.md`に記載済みのものを含む）: `EmployeeSkillLink(employeeId, skillId, skillVersionId)`, `ProjectSkillLink(projectId, skillId, skillVersionId)`, `ProjectRoleLink(projectId, projectRoleId)`, `StationLineLink(lineId, stationId)`, `User.employeeId`, `User.email`
- `EmployeeCertificationLink`は意図的にUNIQUE制約なし（再取得履歴を複数行許容、`docs/design/data-model.md`参照）

## 7. 未確定事項

- ~~PDF出力（REF005）の実現方式~~ → ブラウザ印刷ベースで確定（ADR `0009`）
- スキル・資格の削除時に関連データがある場合の画面表示（「削除済み」の見せ方）は実装時に調整の余地あり
