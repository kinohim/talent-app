# サブエージェント設計方針

ハッカソンの「ハーネス」評価軸に対応。フェーズごとに役割を分けたサブエージェントを想定する。

| エージェント名 | 役割 | 定義ファイル |
|---|---|---|
| requirements-agent | 要件整理・仕様策定。requirements.mdの更新とADR案起草。意思決定は「決めてほしい事項リスト」としてユーザーに返す | `.claude/agents/requirements-agent.md` |
| design-agent | アーキテクチャ設計・データモデル設計。docs/design/配下の設計書更新と複数ドキュメントの整合性維持 | `.claude/agents/design-agent.md` |
| impl-agent | 実装・リファクタリング・デバッグ | `.claude/agents/impl-agent.md` |
| test-agent | テスト戦略・ケース設計・自動テスト生成（vitest、DBはモック）。期待値は実装ではなく設計書から導く | `.claude/agents/test-agent.md` |
| infra-agent | DB構築（docker-compose/PostgreSQL）・Prismaマイグレーション・シード・デプロイ準備（Neon/Supabase・Vercel想定）。破壊的操作はユーザー指示必須 | `.claude/agents/infra-agent.md` |
| design-review-agent | 設計書（要件定義書・基本設計書・詳細設計書・DB設計書・画面設計、およびExcel出力版）のレビュー。矛盾・抜け漏れ・ADRとの不整合を洗い出し、報告のみ行う（資料への反映はユーザー承認後） | `.claude/agents/design-review-agent.md` |
| code-review-agent | 実装コード（src/・prisma/・tests/）のレビュー。設計書との突き合わせで権限チェック漏れ・論理削除漏れ・設計乖離を洗い出し、報告のみ行う（修正はimpl-agent） | `.claude/agents/code-review-agent.md` |

全エージェントの定義を `.claude/agents/` 配下に配置済み（2026-07-09）。

## 役割分担の設計方針

- **作る側と見る側を分ける**: design-agent（書く）⇔ design-review-agent（指摘のみ）、impl-agent（書く）⇔ code-review-agent（指摘のみ）、impl-agent（実装）⇔ test-agent（設計書起点で検証）。レビュー系エージェントは編集権限を持たない
- **編集範囲を役割ごとに限定する**: requirements-agentはrequirements.mdとADR案のみ、test-agentはtests/のみ、infra-agentはinfra/と.env系のみ等。越境が必要なときは提案として報告し、担当エージェント／ユーザーに委ねる
- **サブエージェントは意思決定しない**: 判断が必要な事項は選択肢とトレードオフを整理して「決めてほしい事項リスト」として返し、決定はユーザーが行いADRに記録する
- **共通の禁止事項**: `docs/design/excel-export/*.xlsx`への書き込みは全エージェント禁止（読み取りもSkill/openpyxl保存系を使わない。過去に上書き事故の実績あり）
