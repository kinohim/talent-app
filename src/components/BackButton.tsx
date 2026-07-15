"use client";

import { usePathname, useRouter } from "next/navigation";

/**
 * 全画面共通の「戻る」ボタン。トップページ（/）以外の全画面に表示する。
 */
export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/") return null;

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-4 inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-700 hover:underline"
    >
      ← 戻る
    </button>
  );
}
