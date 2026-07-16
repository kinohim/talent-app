# SkillDashboard 移植メモ

`dashboard_mockup.html`(スキルマップ／組織ダッシュボード)をNext.js/React用に移植したものです。

## ファイル構成

```
SkillDashboard/
├── SkillDashboard.tsx           # 本体コンポーネント
├── SkillDashboard.module.css    # スタイル(CSS Modules)
├── data.ts                      # サンプルデータ・型定義
├── index.ts                     # re-export用バレルファイル
├── example-app-router-page.tsx  # App Router向け配置例
└── example-pages-router-page.tsx# Pages Router向け配置例
```

## 推奨の配置場所

既存プロジェクトの構成に合わせて、`SkillDashboard/` フォルダごと以下のいずれかに配置してください。

- `src/` ディレクトリを使っている場合: `src/components/SkillDashboard/`
- 使っていない場合: `components/SkillDashboard/`

`example-*.tsx` はそのままコピーせず、中身を参考にして既存の `app/` または `pages/` 配下の該当ページに組み込んでください（ファイル名はプロジェクトのルーティングに合わせて自由に変更してOKです)。

import 文がエイリアス `@/` を使っています。`tsconfig.json` に以下がなければ追加してください(create-next-appのデフォルトには含まれています)。

```jsonc
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] } // src構成でない場合は "./*"
  }
}
```

## 動作するインタラクション

- 「資格別保有者数」のタブ切替(国家資格／ベンダー資格／その他)
- スキル一覧の行クリックで保有者一覧を開閉
- 「もっと見る」で11位以降のスキルを表示/非表示

「プログラミング言語／クラウド…」のタブは元デザイン同様、見た目の切替のみです(実際のフィルタリングは未実装)。フィルタが必要であれば `data.ts` にカテゴリ情報を追加し、`skillBars` を絞り込むロジックを `SkillDashboard.tsx` に足してください。

## 未実装（プレースホルダー）

- Excel出力ボタン: `onExportCerts` / `onExportRisk` props 経由でハンドラを渡せます。実際のExcel生成(例: `xlsx` ライブラリでのクライアント生成、または `/api/export` を叩くAPI呼び出し)はプロジェクト側で実装してください。
- サマリーカード・ヒートマップ・属人化リスクのデータは `data.ts` にハードコードされたサンプルです。実データはAPI取得結果に差し替えてください。

## 前提

- TypeScript + CSS Modules を前提にしています。JavaScript(.jsx)で使いたい場合は型定義(`data.ts`の`interface`/`type`部分)を外せばそのまま動きます。
- Tailwindなど特定のCSSフレームワークには依存していません(元デザインが素のCSSだったため、CSS Modulesでそのまま移植しています)。
