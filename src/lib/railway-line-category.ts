/**
 * 最寄り駅入力(路線プルダウン)で、HeartRails Express APIが返す路線名をカテゴリ分けするための
 * 簡易ヒューリスティック。路線名の文字列パターンのみから判定するため厳密な事業者マスタは持たない。
 */
const CATEGORY_ORDER = ["JR", "地下鉄", "私鉄・その他", "モノレール・新交通", "新幹線"] as const;

export type RailwayLineCategory = (typeof CATEGORY_ORDER)[number];

export function categorizeLine(lineName: string): RailwayLineCategory {
  if (lineName.includes("新幹線")) return "新幹線";
  if (lineName.startsWith("JR")) return "JR";
  if (lineName.includes("メトロ") || lineName.includes("地下鉄") || lineName.startsWith("都営")) {
    return "地下鉄";
  }
  if (lineName.includes("モノレール") || lineName.includes("新交通") || lineName.includes("ライナー")) {
    return "モノレール・新交通";
  }
  return "私鉄・その他";
}

export function groupLinesByCategory(lines: string[]): { category: RailwayLineCategory; lines: string[] }[] {
  const buckets = new Map<RailwayLineCategory, string[]>();
  for (const line of lines) {
    const category = categorizeLine(line);
    const list = buckets.get(category) ?? [];
    list.push(line);
    buckets.set(category, list);
  }
  return CATEGORY_ORDER.filter((category) => buckets.has(category)).map((category) => ({
    category,
    lines: buckets.get(category)!,
  }));
}
