import { describe, expect, it } from "vitest";
import { categorizeLine, groupLinesByCategory } from "@/lib/railway-line-category";

/**
 * src/lib/railway-line-category.ts のユニットテスト。
 * HeartRails Express APIの実レスポンス(東京都の路線名88件、2026-07取得)から
 * 代表的なパターンを抜粋して検証する。
 */
describe("categorizeLine", () => {
  it.each([
    ["JR山手線", "JR"],
    ["JR常磐線快速", "JR"],
    ["東海道新幹線", "新幹線"],
    ["北陸新幹線", "新幹線"],
    ["東京メトロ銀座線", "地下鉄"],
    ["都営浅草線", "地下鉄"],
    ["都電荒川線", "私鉄・その他"], // 都営交通局運営だが路面電車であり地下鉄ではない
    ["多摩モノレール", "モノレール・新交通"],
    ["新交通ゆりかもめ", "モノレール・新交通"],
    ["日暮里・舎人ライナー", "モノレール・新交通"],
    ["京王線", "私鉄・その他"],
    ["東急東横線", "私鉄・その他"],
    ["つくばエクスプレス線", "私鉄・その他"],
  ])("%s は %s に分類される", (lineName, expected) => {
    expect(categorizeLine(lineName)).toBe(expected);
  });
});

describe("groupLinesByCategory", () => {
  it("カテゴリごとにグループ化し、JR→地下鉄→私鉄・その他→モノレール・新交通→新幹線の順で返す", () => {
    const grouped = groupLinesByCategory(["京王線", "JR山手線", "東海道新幹線", "都営浅草線"]);
    expect(grouped.map((g) => g.category)).toEqual(["JR", "地下鉄", "私鉄・その他", "新幹線"]);
    expect(grouped.find((g) => g.category === "JR")?.lines).toEqual(["JR山手線"]);
  });

  it("該当路線が1件もないカテゴリは結果に含まれない", () => {
    const grouped = groupLinesByCategory(["京王線"]);
    expect(grouped).toEqual([{ category: "私鉄・その他", lines: ["京王線"] }]);
  });

  it("空配列を渡すと空配列を返す", () => {
    expect(groupLinesByCategory([])).toEqual([]);
  });
});
