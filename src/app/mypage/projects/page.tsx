import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeDetailInclude, serializeEmployeeDetail } from "@/lib/employee-select";

function fmtDate(value: string | Date | null) {
  if (!value) return "-";
  const iso = value instanceof Date ? value.toISOString() : value;
  return iso.slice(0, 10);
}

/**
 * REF006 プロジェクト経歴一覧（/mypage/projects）。
 * 本人が担当したプロジェクト経歴の一覧を表示（件数上限なし、新しい現場が上、screens.md #7）。
 * 新規追加ボタンはEDT005（新規）、各行は選択したプロジェクトのみを編集するEDT005（該当行）へ遷移する。
 */
export default async function MyProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const employeeId = session.user.employeeId;
  const employee = await prisma.employee.findUnique({
    where: { employeeId },
    include: employeeDetailInclude,
  });

  if (!employee) {
    return (
      <div className="card">
        <p className="text-sm text-slate-500">
          社員情報が見つかりませんでした。管理者にお問い合わせください。
        </p>
      </div>
    );
  }

  const serialized = serializeEmployeeDetail(employee);
  const addHref = `/resumes/${employeeId}/edit/projects`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">現場（プロジェクト）経歴一覧</h1>
        <Link href={addHref} className="btn-primary">
          新規追加
        </Link>
      </div>

      {serialized.projects.length === 0 ? (
        <p className="card text-sm text-slate-400">登録されている現場経歴はありません</p>
      ) : (
        <div className="space-y-4">
          {serialized.projects.map((p) => (
            <Link
              key={p.id}
              href={`${addHref}/${p.id}`}
              className="card block space-y-2 transition hover:border-brand-500 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{p.siteName}</h2>
                <span className="text-sm text-slate-500">
                  {fmtDate(p.startDate)} 〜 {fmtDate(p.endDate)}
                </span>
              </div>
              <p className="text-sm text-slate-700">{p.projectTitle}</p>
              <p className="text-xs text-slate-500">
                役割: {p.roles.map((r) => r.roleName).join("、") || "未設定"} / チーム人数:{" "}
                {p.teamSize ?? "-"}
              </p>
              {p.skills.length > 0 && (
                <p className="text-xs text-slate-500">
                  使用スキル: {p.skills.map((s) => s.skillName).join("、")}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
