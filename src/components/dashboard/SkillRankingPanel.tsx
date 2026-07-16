"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DashboardSkillItem, HeatmapColumn } from "@/lib/dashboard";

const TOP_COUNT = 10;

export function SkillRankingPanel({
  items,
  categories,
}: {
  items: DashboardSkillItem[];
  categories: HeatmapColumn[];
}) {
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [openSkillIds, setOpenSkillIds] = useState<Set<number>>(new Set());

  const filtered = useMemo(
    () =>
      activeCategoryId === null
        ? items
        : items.filter((item) => item.categoryId === activeCategoryId),
    [items, activeCategoryId]
  );

  const maxCount = Math.max(1, ...filtered.map((item) => item.count));
  const visible = showAll ? filtered : filtered.slice(0, TOP_COUNT);
  const hiddenCount = Math.max(0, filtered.length - TOP_COUNT);

  const toggleOpen = (skillId: number) => {
    setOpenSkillIds((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  };

  return (
    <section className="card space-y-4">
      <div>
        <h2 className="text-lg font-semibold">スキル別保有者数</h2>
        <p className="text-sm text-slate-500">
          カテゴリ絞込 → 保有者数の多い順に上位{TOP_COUNT}件 → もっと見る、の3段構え
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => {
            setActiveCategoryId(null);
            setShowAll(false);
          }}
          className={
            activeCategoryId === null
              ? "rounded-full bg-brand-600 px-3 py-1 text-sm font-semibold text-white"
              : "rounded-full px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
          }
        >
          すべて
        </button>
        {categories.map((cat) => (
          <button
            key={cat.categoryId}
            type="button"
            onClick={() => {
              setActiveCategoryId(cat.categoryId);
              setShowAll(false);
            }}
            className={
              activeCategoryId === cat.categoryId
                ? "rounded-full bg-brand-600 px-3 py-1 text-sm font-semibold text-white"
                : "rounded-full px-3 py-1 text-sm text-slate-600 hover:bg-slate-100"
            }
          >
            {cat.categoryName}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">該当するスキル保有者がいません</p>
      )}

      <div className="space-y-1">
        {visible.map((item) => {
          const isOpen = openSkillIds.has(item.skillId);
          const widthPercent = (item.count / maxCount) * 100;
          return (
            <div key={item.skillId} className="rounded border border-transparent">
              <button
                type="button"
                onClick={() => toggleOpen(item.skillId)}
                className="grid w-full grid-cols-[minmax(0,10rem)_1fr_3rem_1.5rem] items-center gap-3 rounded px-2 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="truncate">
                  {item.skillName}
                  {item.count === 1 && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                      1名のみ
                    </span>
                  )}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <span
                    className={
                      item.count === 1
                        ? "block h-full rounded-full bg-amber-400"
                        : "block h-full rounded-full bg-brand-500"
                    }
                    style={{ width: `${widthPercent}%` }}
                  />
                </span>
                <span className="text-right text-slate-600">{item.count}名</span>
                <span className={isOpen ? "rotate-90 transition-transform" : "transition-transform"}>
                  ▶
                </span>
              </button>
              {isOpen && (
                <div className="flex flex-wrap gap-2 px-2 pb-2">
                  {item.holders.map((holder) =>
                    holder.canViewDetail ? (
                      <Link
                        key={holder.employeeId}
                        href={`/resumes/${holder.employeeId}`}
                        className="rounded-full bg-brand-50 px-2 py-1 text-xs text-brand-700 hover:underline"
                      >
                        {holder.name}
                      </Link>
                    ) : (
                      <span
                        key={holder.employeeId}
                        className="cursor-not-allowed rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-400"
                        title="他部署の経歴書詳細は閲覧できません"
                      >
                        {holder.name}
                      </span>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-sm text-brand-600 hover:underline"
          >
            {showAll ? "▲ 上位10件に戻す" : `▼ すべて表示（残り${hiddenCount}件）`}
          </button>
        </div>
      )}
    </section>
  );
}
