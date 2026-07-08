import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditEmployee, canViewEmployee } from "@/lib/authz";
import { employeeDetailInclude, serializeEmployeeDetail } from "@/lib/employee-select";
import { ResumeDetail } from "@/components/ResumeDetail";
import { Forbidden } from "@/components/Forbidden";

type RouteParams = { params: Promise<{ employeeId: string }> };

/**
 * REF003 経歴書詳細（/resumes/[employeeId]）。閲覧専用画面。
 * 他社員閲覧と本人確認（マイページから遷移）の共通画面。
 * GENERALは部署レベル一致（自部署）のみ閲覧可、URL直打ちは403（ADR 0008）。
 * 編集権限がある場合はEDT001〜004への編集導線を表示（EDT005導線はStage 3）。
 */
export default async function ResumeDetailPage({ params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { employeeId } = await params;
  const employee = await prisma.employee.findUnique({
    where: { employeeId },
    include: employeeDetailInclude,
  });

  if (!employee) notFound();

  if (!(await canViewEmployee(session, employee))) {
    return <Forbidden message="同じ部署の社員の経歴書のみ閲覧できます" />;
  }

  const canEdit = !employee.deletedAt && (await canEditEmployee(session, employee));

  return (
    <ResumeDetail
      employee={serializeEmployeeDetail(employee)}
      editBase={canEdit ? `/resumes/${employeeId}/edit` : null}
    />
  );
}
