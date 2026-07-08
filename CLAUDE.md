# CLAUDE.md

## プロジェクト概要

社内タレントマネジメントアプリ（履歴書作成支援）。社内AIハッカソン発表用、かつAI駆動開発の学習が目的。

## 目的（3つ）

1. 社内の履歴書作成業務を効率化するアプリを作る
2. 社内AIハッカソンで発表する
3. AI駆動開発（CLAUDE.md・サブエージェント活用）を学ぶ

## 技術スタック

- Next.js（TypeScript）フロント・API一体型
- DB: PostgreSQL（Neon/Supabase想定）／ORM: Prisma／認証: Auth.js（Microsoft Entra IDプロバイダ。Credentialsから変更、`docs/decisions/0007-screen-list-pdf-adoption.md`参照）
- 詳細・選定理由は `docs/decisions/0001-tech-stack.md` を参照
- 画面構成は `docs/design/excel-export/01_画面一覧.pdf`（22画面）を正とする（ADR 0007）。閲覧権限はADR 0008参照

## コーディング規約

（実装フェーズで確定し次第、ここに追記する）

## AI運用ルール

- 各フェーズ（設計・実装・テスト・インフラ）で使ったプロンプトや意思決定は `docs/decisions/` と `docs/hackathon/ai-usage-log.md` に記録する
- サブエージェントの役割分担は `docs/hackathon/agents-plan.md` を参照する（Claude Codeで運用する際は `.claude/agents/` にエージェント定義を配置する）
- ハッカソン評価軸との対応は `docs/hackathon/evaluation-mapping.md` を参照する

## 参照ドキュメント

- 要件定義: `docs/requirements/`
- 設計: `docs/design/`
- ハッカソン関連: `docs/hackathon/`
