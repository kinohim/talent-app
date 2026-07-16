import type { DashboardSummary } from "@/lib/dashboard";

/** REF008 サマリーカード4枚(登録メンバー数・登録スキル種類・資格保有件数・属人化リスク件数)。 */
export function SummaryCards({ summary }: { summary: DashboardSummary }) {
  const cards = [
    { label: "登録メンバー数", value: summary.memberCount, unit: "名" },
    { label: "登録スキル種類", value: summary.skillTypeCount, unit: "種類" },
    { label: "資格保有件数", value: summary.certCount, unit: "件" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="card">
          <div className="text-sm text-slate-500">{card.label}</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {card.value}
            <span className="ml-1 text-sm font-normal text-slate-500">{card.unit}</span>
          </div>
        </div>
      ))}
      <div className="card border-2 border-amber-300 bg-amber-50">
        <div className="text-sm text-amber-700">⚠ 保有者1名のスキル</div>
        <div className="mt-1 text-2xl font-bold text-amber-800">
          {summary.riskSkillCount}
          <span className="ml-1 text-sm font-normal text-amber-700">件</span>
        </div>
      </div>
    </div>
  );
}
