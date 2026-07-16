// このファイルはモックアップのサンプルデータです。
// 実際の連携時は、ここを API / DB からの取得結果に置き換えてください。

export type CertCategoryKey = "national" | "vendor" | "other";

export interface CertLegendItem {
  color: string;
  label: string;
}

export interface CertCategory {
  key: CertCategoryKey;
  label: string;
  total: number;
  gradient: string;
  legend: CertLegendItem[];
}

export const certCategories: CertCategory[] = [
  {
    key: "national",
    label: "国家資格",
    total: 12,
    gradient:
      "conic-gradient(#3357d6 0% 41.7%, #5c7cf0 41.7% 66.7%, #8fa6f5 66.7% 83.3%, #c2cffa 83.3% 91.7%, #e6e8f0 91.7% 100%)",
    legend: [
      { color: "#3357d6", label: "基本情報技術者(5)" },
      { color: "#5c7cf0", label: "応用情報技術者(3)" },
      { color: "#8fa6f5", label: "ネットワークスペシャリスト(2)" },
      { color: "#c2cffa", label: "ITパスポート(1)" },
      { color: "#e6e8f0", label: "その他(1)" },
    ],
  },
  {
    key: "vendor",
    label: "ベンダー資格",
    total: 14,
    gradient:
      "conic-gradient(#3357d6 0% 43%, #5c7cf0 43% 72%, #8fa6f5 72% 86%, #c2cffa 86% 100%)",
    legend: [
      { color: "#3357d6", label: "AWS認定(6)" },
      { color: "#5c7cf0", label: "Microsoft Azure(4)" },
      { color: "#8fa6f5", label: "Oracle Master(2)" },
      { color: "#c2cffa", label: "Google Cloud(2)" },
    ],
  },
  {
    key: "other",
    label: "その他",
    total: 5,
    gradient: "conic-gradient(#3357d6 0% 40%, #5c7cf0 40% 80%, #8fa6f5 80% 100%)",
    legend: [
      { color: "#3357d6", label: "簿記(2)" },
      { color: "#5c7cf0", label: "FP技能士(2)" },
      { color: "#8fa6f5", label: "ビジネス実務法務(1)" },
    ],
  },
];

export const skillTabs = [
  "プログラミング言語",
  "クラウド／インフラ",
  "データベース",
  "業務知識",
];

export interface SkillBar {
  id: string;
  name: string;
  count: number;
  widthPercent: number;
  rare?: boolean;
  members: string[];
  overflowMore?: boolean; // "もっと見る" で開いた時のみ表示
}

export const skillBars: SkillBar[] = [
  { id: "java", name: "Java", count: 12, widthPercent: 100, members: ["開発 太郎", "営業 花子", "…ほか10名"] },
  { id: "python", name: "Python", count: 9, widthPercent: 75, members: ["開発 太郎", "…ほか8名"] },
  { id: "typescript", name: "TypeScript", count: 8, widthPercent: 66.7, members: ["営業 花子", "…ほか7名"] },
  { id: "sql", name: "SQL", count: 7, widthPercent: 58.3, members: ["佐藤 次郎", "…ほか6名"] },
  { id: "javascript", name: "JavaScript", count: 6, widthPercent: 50, members: ["田中 四郎", "…ほか5名"] },
  { id: "csharp", name: "C#", count: 5, widthPercent: 41.7, members: ["高橋 五郎", "…ほか4名"] },
  { id: "php", name: "PHP", count: 4, widthPercent: 33.3, members: ["伊藤 六実", "…ほか3名"] },
  { id: "ruby", name: "Ruby", count: 3, widthPercent: 25, members: ["渡辺 七海", "…ほか2名"] },
  { id: "kotlin", name: "Kotlin", count: 2, widthPercent: 16.7, members: ["小林 八郎", "加藤 九子"] },
  { id: "swift", name: "Swift", count: 2, widthPercent: 16.7, members: ["吉田 十太", "山本 十一"] },
  { id: "go", name: "Go", count: 1, widthPercent: 8.3, rare: true, members: ["山田 一郎"], overflowMore: true },
  { id: "cobol", name: "COBOL", count: 1, widthPercent: 8.3, rare: true, members: ["鈴木 三郎"], overflowMore: true },
  { id: "rust", name: "Rust", count: 1, widthPercent: 8.3, members: ["中村 十二"], overflowMore: true },
];

export interface HeatRow {
  dept: string;
  cells: { level: 0 | 1 | 2 | 3 | 4; value: number }[];
}

export const heatColumns = ["システム開発", "DB", "インフラ", "マネジメント"];

export const heatRows: HeatRow[] = [
  {
    dept: "ソリューション開発部",
    cells: [
      { level: 4, value: 12 },
      { level: 2, value: 5 },
      { level: 1, value: 3 },
      { level: 1, value: 2 },
    ],
  },
  {
    dept: "DXサービス部",
    cells: [
      { level: 3, value: 8 },
      { level: 1, value: 2 },
      { level: 2, value: 6 },
      { level: 0, value: 0 },
    ],
  },
  {
    dept: "金融サービス部",
    cells: [
      { level: 2, value: 5 },
      { level: 3, value: 7 },
      { level: 1, value: 2 },
      { level: 1, value: 3 },
    ],
  },
  {
    dept: "流通サービス部",
    cells: [
      { level: 1, value: 3 },
      { level: 1, value: 2 },
      { level: 0, value: 0 },
      { level: 1, value: 2 },
    ],
  },
];

export interface RiskItem {
  skill: string;
  who: string;
}

export const riskItems: RiskItem[] = [
  { skill: "Go", who: "保有者：山田 一郎（ソリューション開発部）" },
  { skill: "Oracle DB運用", who: "保有者：佐藤 次郎（金融サービス部）" },
  { skill: "COBOL", who: "保有者：鈴木 三郎（金融サービス部）" },
];

export const summaryStats = {
  memberCount: 42,
  skillTypeCount: 64,
  certCount: 31,
  riskSkillCount: 3,
};
