"use client";

import { useState } from "react";
import type { CertificationCategorySummary } from "@/lib/dashboard";

/** 凡例・ドーナツの色数は5(legendは上位5件までに絞っているため)。ブランドカラーの濃淡で表現する。 */
const PALETTE = ["#213b8a", "#3560d8", "#7b96e8", "#b8c8f5", "#e6e8f0"];

function buildGradient(legend: { count: number }[], total: number): string {
  if (total === 0) return "conic-gradient(#e6e8f0 0% 100%)";
  let acc = 0;
  const stops: string[] = [];
  legend.forEach((item, i) => {
    const from = (acc / total) * 100;
    acc += item.count;
    const to = (acc / total) * 100;
    stops.push(`${PALETTE[i % PALETTE.length]} ${from}% ${to}%`);
  });
  if (acc < total) {
    stops.push(`#e6e8f0 ${(acc / total) * 100}% 100%`);
  }
  return `conic-gradient(${stops.join(", ")})`;
}

export function CertificationPanel({
  categories,
}: {
  categories: CertificationCategorySummary[];
}) {
  const [activeId, setActiveId] = useState(categories[0]?.categoryId);
  const active = categories.find((c) => c.categoryId === activeId) ?? categories[0];

  if (!active) {
    return (
      <section className="card">
        <h2 className="text-lg font-semibold">資格別保有者数</h2>
        <p className="mt-2 text-sm text-slate-400">資格カテゴリが登録されていません</p>
      </section>
    );
  }

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">資格別保有者数</h2>
        <p className="text-sm text-slate-500">タブで資格カテゴリを切り替え</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        {categories.map((cat) => (
          <button
            key={cat.categoryId}
            type="button"
            onClick={() => setActiveId(cat.categoryId)}
            className={
              cat.categoryId === active.categoryId
                ? "rounded-full bg-brand-600 px-3 py-1 text-sm font-semibold text-white"
                : "rounded-full px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
            }
          >
            {cat.categoryName}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <div
          className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full"
          style={{ background: buildGradient(active.legend, active.total) }}
        >
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white">
            <b className="text-xl">{active.total}</b>
            <span className="text-xs text-slate-500">件</span>
          </div>
        </div>
        <ul className="space-y-1 text-sm">
          {active.legend.length === 0 && (
            <li className="text-slate-400">該当する資格保有者がいません</li>
          )}
          {active.legend.map((item, i) => (
            <li key={item.certificationId} className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ background: PALETTE[i % PALETTE.length] }}
              />
              {item.certificationName}（{item.count}）
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
