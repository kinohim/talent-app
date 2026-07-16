import type { SkillCategoryHeatmap } from "@/lib/dashboard";

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-slate-50 text-slate-300",
  1: "bg-brand-50 text-slate-700",
  2: "bg-brand-100 text-slate-800",
  3: "bg-brand-500 text-white",
  4: "bg-brand-700 text-white",
};

/** REF008 部署×スキルカテゴリ保有者数ヒートマップ。空白(level=0)が「組織の穴」を示す。 */
export function HeatmapPanel({ heatmap }: { heatmap: SkillCategoryHeatmap }) {
  return (
    <section className="card space-y-3">
      <div>
        <h2 className="text-lg font-semibold">部署 × スキルカテゴリ 保有者数ヒートマップ</h2>
        <p className="text-sm text-slate-500">色が濃い＝人数が多い。空白セルが「組織の穴」です</p>
      </div>

      {heatmap.rows.length === 0 || heatmap.columns.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">集計対象の部署・スキルカテゴリがありません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th className="text-left font-medium text-slate-500">部署</th>
                {heatmap.columns.map((col) => (
                  <th key={col.categoryId} className="px-2 font-medium text-slate-500">
                    {col.categoryName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmap.rows.map((row) => (
                <tr key={row.departmentId}>
                  <th className="whitespace-nowrap text-left font-medium text-slate-700">
                    {row.departmentName}
                  </th>
                  {row.cells.map((cell, i) => (
                    <td
                      key={i}
                      className={`rounded text-center ${LEVEL_CLASS[cell.level]}`}
                    >
                      {cell.count}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-1 text-xs text-slate-500">
        少ない
        {[0, 1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={`h-4 w-6 rounded ${LEVEL_CLASS[level as 0 | 1 | 2 | 3 | 4]}`}
          />
        ))}
        多い
      </div>
    </section>
  );
}
