"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 開閉式のチェックボックス付きプルダウン（複数選択）。
 * 見た目上は閉じたプルダウンだが、実体は<input type="checkbox">なので
 * 親の<form method="get">にそのまま乗せてサーバー側の検索処理と連携できる。
 */
export function MultiSelectDropdown({
  name,
  options,
  defaultValues,
  placeholder,
}: {
  name: string;
  options: { id: number; label: string }[];
  defaultValues: number[];
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>(defaultValues);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  }

  const selectedLabels = options.filter((o) => selected.includes(o.id)).map((o) => o.label);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="form-input flex w-full items-center justify-between text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`truncate ${selectedLabels.length === 0 ? "text-slate-400" : ""}`}>
          {selectedLabels.length > 0 ? selectedLabels.join("、") : placeholder}
        </span>
        <span className="ml-2 shrink-0 text-slate-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white p-2 shadow-lg">
          {options.map((o) => (
            <label
              key={o.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
            >
              <input
                type="checkbox"
                name={name}
                value={o.id}
                checked={selected.includes(o.id)}
                onChange={() => toggle(o.id)}
              />
              {o.label}
            </label>
          ))}
          {options.length === 0 && <p className="px-2 py-1 text-sm text-slate-400">選択肢がありません</p>}
        </div>
      )}
    </div>
  );
}
