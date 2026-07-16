import Link from "next/link";
import type { DashboardSkillItem } from "@/lib/dashboard";

/** REF008 属人化リスク一覧(保有者1名のスキル)。担当者の異動・退職で業務が止まる可能性があるスキルを一覧表示する。 */
export function RiskPanel({ riskSkills }: { riskSkills: DashboardSkillItem[] }) {
  return (
    <section className="card space-y-3 border-2 border-amber-200">
      <div>
        <h2 className="text-lg font-semibold text-amber-800">⚠ 属人化リスク（保有者1名のスキル）</h2>
        <p className="text-sm text-slate-500">
          担当者の異動・退職で業務が止まる可能性があるスキルの一覧
        </p>
      </div>

      {riskSkills.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">該当するスキルはありません</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {riskSkills.map((item) => {
            const holder = item.holders[0];
            return (
              <li key={item.skillId} className="flex items-center justify-between py-2">
                <div>
                  <b>{item.skillName}</b>
                  <div className="text-sm text-slate-500">
                    保有者：
                    {holder ? (
                      holder.canViewDetail ? (
                        <Link
                          href={`/resumes/${holder.employeeId}`}
                          className="text-brand-600 hover:underline"
                        >
                          {holder.name}
                        </Link>
                      ) : (
                        <span title="他部署の経歴書詳細は閲覧できません">{holder.name}</span>
                      )
                    ) : (
                      "-"
                    )}
                    {holder?.departmentName && `（${holder.departmentName}）`}
                  </div>
                </div>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                  1名のみ
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
