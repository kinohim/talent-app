import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeDetailInclude, serializeEmployeeDetail } from "@/lib/employee-select";

/**
 * REF004 マイページ（/mypage）。
 * 本人の経歴書メニュー一覧を確認し、各編集画面（EDT001〜005）へ遷移する起点画面。
 * PDF出力（REF005）・プロジェクト経歴一覧（REF006）への導線を持つ。
 */
export default async function MyPage() {
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

  const editMenu = [
    {
      href: `/resumes/${employeeId}/edit/basic`,
      label: "基本情報・経歴書編集",
      description: `氏名・生年月日・所属組織・最終学歴・経歴概要・自己PR・保有スキル(${serialized.skills.length}件)・保有資格(${serialized.certifications.length}件)`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">マイ経歴書</h1>
        <p className="text-sm text-slate-500">
          {serialized.name}（{employeeId}）
        </p>
      </div>

      <section className="card space-y-3">
        <h2 className="font-semibold">経歴書</h2>
        <p className="text-sm text-slate-500">
          自分の経歴書の全項目を確認するには「確認する」から経歴書詳細へ進んでください。
        </p>
        <div className="flex flex-wrap gap-4">
          <Link href={`/resumes/${employeeId}`} className="btn-secondary px-8 py-3 text-base">
            確認する
          </Link>
          <Link href={`/resumes/${employeeId}/preview`} className="btn-primary px-8 py-3 text-base">
            PDF出力
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-500">編集メニュー</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {editMenu.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card block transition hover:border-brand-500 hover:shadow-md"
            >
              <h3 className="font-semibold text-brand-700">{item.label}</h3>
              <p className="mt-1 text-sm text-slate-500">{item.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">現場（プロジェクト）経歴一覧</h2>
          <Link href="/mypage/projects" className="text-sm text-brand-600 hover:underline">
            一覧を見る
          </Link>
        </div>
        <p className="text-sm text-slate-500">
          担当したプロジェクト経歴の一覧（REF006）を確認できます。編集は上記「現場（プロジェクト）経歴編集」から行います。
        </p>
      </section>
    </div>
  );
}
