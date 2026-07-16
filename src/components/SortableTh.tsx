import Link from "next/link";

/**
 * クリックでソート(昇順⇄降順)する一覧テーブルの見出し(REF002・REF007共通)。
 * ソート状態はURLクエリで管理するため、リンク先は呼び出し元がbuildHrefで組み立てる。
 */
export function SortableTh({
  label,
  columnKey,
  activeSortBy,
  activeSortOrder,
  buildHref,
}: {
  label: string;
  columnKey: string;
  activeSortBy: string;
  activeSortOrder: "asc" | "desc";
  buildHref: (sortBy: string, sortOrder: "asc" | "desc") => string;
}) {
  const isActive = activeSortBy === columnKey;
  const nextOrder: "asc" | "desc" = isActive && activeSortOrder === "asc" ? "desc" : "asc";

  return (
    <th>
      <Link
        href={buildHref(columnKey, nextOrder)}
        className="inline-flex items-center gap-1 hover:text-brand-700 hover:underline"
      >
        {label}
        <span className="text-xs text-slate-400">{isActive ? (activeSortOrder === "asc" ? "▲" : "▼") : ""}</span>
      </Link>
    </th>
  );
}
