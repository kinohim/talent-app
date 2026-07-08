import Link from "next/link";

/**
 * 403（権限なし）表示。REF003へのURL直打ち等、サーバー側の権限チェックで
 * 弾かれた場合に画面として表示する（screens.md「画面遷移の要点」）。
 */
export function Forbidden({
  message = "このページを表示する権限がありません",
}: {
  message?: string;
}) {
  return (
    <div className="card mx-auto max-w-lg space-y-4 text-center">
      <p className="text-4xl font-bold text-slate-300">403</p>
      <p className="text-sm text-slate-600">{message}</p>
      <div>
        <Link href="/resumes" className="btn-secondary">
          経歴書一覧へ戻る
        </Link>
      </div>
    </div>
  );
}
