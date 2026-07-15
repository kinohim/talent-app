"use client";

import { useEffect, useRef, useState } from "react";

/**
 * EDT001 最寄り駅入力。外部の無料駅検索API（/api/stations/search経由）でリアルタイム候補を出し、
 * 選択された駅名は自駅マスタにfind-or-create（POST /api/stations）してnearestStationIdを確定する。
 */
export function StationSearchInput({
  initialName,
  onSelect,
}: {
  initialName: string | null;
  onSelect: (stationId: number | null) => void;
}) {
  const [query, setQuery] = useState(initialName ?? "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(value: string) {
    setQuery(value);
    onSelect(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/stations/search?q=${encodeURIComponent(value.trim())}`);
      if (!res.ok) return;
      const data = await res.json();
      setSuggestions(data.items ?? []);
      setOpen(true);
    }, 300);
  }

  async function handlePick(name: string) {
    setQuery(name);
    setOpen(false);
    setResolving(true);
    try {
      const res = await fetch("/api/stations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stationName: name }),
      });
      if (!res.ok) return;
      const data = await res.json();
      onSelect(data.id as number);
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="relative">
      <input
        className="form-input"
        value={query}
        placeholder="駅名を入力して検索"
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {resolving && <p className="mt-1 text-xs text-slate-400">登録中…</p>}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {suggestions.map((name) => (
            <li key={name}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(name)}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
