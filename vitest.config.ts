import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Stage 4: 最低限のユニットテスト実行環境。
 * tsconfig.jsonの`@/*`エイリアスと同じ解決を行う（テストはsrc/lib配下のロジックが対象）。
 * DBには接続しない（prismaはvi.mockでモックする）ため、environmentはnodeで十分。
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
