import Link from "next/link";
import { SignOutButton } from "@/components/SignOutButton";

const ROLE_LABEL: Record<string, string> = {
  GENERAL: "一般社員",
  MANAGER: "管理職",
  HR_SALES: "人事・営業",
  ADMIN: "システム管理者",
};

export function Header({
  user,
}: {
  user: { name: string; role: string; employeeId: string } | null;
}) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-brand-700">
            talent-app
          </Link>
          {user && (
            <nav className="flex items-center gap-4 text-sm text-slate-600">
              <Link href="/resumes" className="hover:text-brand-700 hover:underline">
                経歴書一覧
              </Link>
              <Link href="/dashboard" className="hover:text-brand-700 hover:underline">
                ダッシュボード
              </Link>
            </nav>
          )}
        </div>
        {user && (
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>
              {user.name}（{ROLE_LABEL[user.role] ?? user.role}・{user.employeeId}）
            </span>
            <SignOutButton />
          </div>
        )}
      </div>
    </header>
  );
}
