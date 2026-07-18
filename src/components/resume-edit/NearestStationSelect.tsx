"use client";

import { useEffect, useRef, useState } from "react";
import { PREFECTURES } from "@/lib/prefectures";
import { groupLinesByCategory } from "@/lib/railway-line-category";

/**
 * EDT001/MST005 最寄り駅入力。都道府県→路線→駅の3段階プルダウンで選択する。
 * 路線・駅の一覧はHeartRails Express APIへ都度問い合わせる（駅マスタは持たない）。
 * 3つとも常に操作可能で、駅を選び終えても非活性化・専用の確定表示には切り替えない
 * （選択のたびにonChangeを呼び、そのまま再選択・やり直しができる）。
 * 都道府県・路線・駅の3つは同じPulldownSelect（検索欄付きポップアップ、統一デザイン）で描画する。
 */
export function NearestStationSelect({
  initialLine,
  initialName,
  onChange,
}: {
  initialLine: string | null;
  initialName: string | null;
  onChange: (value: { line: string | null; name: string | null }) => void;
}) {
  const [prefecture, setPrefecture] = useState("");
  const [line, setLine] = useState(initialLine ?? "");
  const [station, setStation] = useState(initialName ?? "");
  const [lines, setLines] = useState<string[]>(initialLine ? [initialLine] : []);
  const [stations, setStations] = useState<string[]>(initialName ? [initialName] : []);
  const [loadingLines, setLoadingLines] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePrefectureChange(value: string) {
    setPrefecture(value);
    setLine("");
    setStation("");
    setLines([]);
    setStations([]);
    setError(null);
    onChange({ line: null, name: null });
    if (!value) return;

    setLoadingLines(true);
    try {
      const res = await fetch(`/api/railways?prefecture=${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLines(data.items ?? []);
    } catch {
      setError("路線一覧の取得に失敗しました");
    } finally {
      setLoadingLines(false);
    }
  }

  async function handleLineChange(value: string) {
    setLine(value);
    setStation("");
    setStations([]);
    setError(null);
    onChange({ line: value || null, name: null });
    if (!value) return;

    setLoadingStations(true);
    try {
      const res = await fetch(`/api/stations?line=${encodeURIComponent(value)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStations(data.items ?? []);
    } catch {
      setError("駅一覧の取得に失敗しました");
    } finally {
      setLoadingStations(false);
    }
  }

  function handleStationChange(value: string) {
    setStation(value);
    onChange({ line: line || null, name: value || null });
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <PulldownSelect
          value={prefecture}
          groups={[{ category: null, items: PREFECTURES }]}
          disabled={false}
          loading={false}
          placeholder="都道府県を選択"
          searchPlaceholder="都道府県名で検索（任意）"
          onChange={handlePrefectureChange}
        />
        <PulldownSelect
          value={line}
          groups={groupLinesByCategory(lines).map((g) => ({ category: g.category, items: g.lines }))}
          disabled={lines.length === 0 || loadingLines}
          loading={loadingLines}
          placeholder="路線を選択"
          searchPlaceholder="路線名で検索（任意）"
          onChange={handleLineChange}
        />
        <PulldownSelect
          value={station}
          groups={[{ category: null, items: stations }]}
          disabled={stations.length === 0 || loadingStations}
          loading={loadingStations}
          placeholder="駅を選択"
          searchPlaceholder="駅名で検索（任意）"
          onChange={handleStationChange}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

type PulldownGroup = { category: string | null; items: readonly string[] };

/**
 * 都道府県・路線・駅の3プルダウン共通コンポーネント。ボタン＋検索欄付きポップアップで、
 * category(路線のJR/地下鉄等)を持つグループは見出しクリックで開閉するアコーディオンにする。
 * categoryがnullのグループ(都道府県・駅)は見出しを出さず項目をそのまま並べる。
 * ネイティブselectではこの検索・アコーディオン表現ができないため独自UIとして実装する。
 */
function PulldownSelect({
  value,
  groups,
  disabled,
  loading,
  placeholder,
  searchPlaceholder = "名前で検索（任意）",
  onChange,
}: {
  value: string;
  groups: PulldownGroup[];
  disabled: boolean;
  loading: boolean;
  placeholder: string;
  searchPlaceholder?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, []);

  const trimmedSearch = search.trim();
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      items: trimmedSearch ? g.items.filter((item) => item.includes(trimmedSearch)) : g.items,
    }))
    .filter((g) => g.items.length > 0);

  function toggleCategory(category: string) {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function handlePick(item: string) {
    onChange(item);
    setOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="form-input flex items-center justify-between text-left disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{loading ? "読み込み中…" : value || placeholder}</span>
        <svg
          className="ml-2 h-4 w-4 shrink-0 text-slate-500"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5.5 7.5L10 12l4.5-4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-72 max-w-[90vw] rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              type="text"
              className="form-input"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-72 overflow-y-auto">
            {filteredGroups.map((g) =>
              g.category === null ? (
                <div key="flat">
                  {g.items.map((item) => (
                    <button
                      type="button"
                      key={item}
                      className="block w-full whitespace-nowrap px-3 py-2 text-left text-sm hover:bg-brand-50"
                      onClick={() => handlePick(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : (
                <div key={g.category}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 text-left text-sm font-semibold hover:bg-slate-100"
                    onClick={() => toggleCategory(g.category!)}
                  >
                    <span>{g.category}</span>
                    <span>{openCategories.has(g.category) || trimmedSearch ? "▼" : "▶"}</span>
                  </button>
                  {(openCategories.has(g.category) || trimmedSearch) && (
                    <div>
                      {g.items.map((item) => (
                        <button
                          type="button"
                          key={item}
                          className="block w-full whitespace-nowrap px-3 py-2 text-left text-sm hover:bg-brand-50"
                          onClick={() => handlePick(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
            {filteredGroups.length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-slate-400">該当する項目がありません</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
