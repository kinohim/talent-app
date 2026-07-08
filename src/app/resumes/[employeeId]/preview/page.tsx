import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewEmployee } from "@/lib/authz";
import { employeeDetailInclude, serializeEmployeeDetail } from "@/lib/employee-select";
import { ResumeDetail } from "@/components/ResumeDetail";
import { Forbidden } from "@/components/Forbidden";
import { PrintButton } from "@/components/PrintButton";

type RouteParams = { params: Promise<{ employeeId: string }> };

/**
 * REF005 印刷用プレビュー（/resumes/[employeeId]/preview）。
 * 経歴書詳細・マイページの「PDF出力」ボタンから遷移する個人経歴書単位の出力画面（ADR 0009）。
 * ブラウザ印刷ベースで実現するため、専用のPDF生成APIは持たない。閲覧権限はREF003と同じ（ADR 0008）。
 */
export default async function ResumePreviewPage({ params }: RouteParams) {
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end no-print">
        <PrintButton />
      </div>
      <ResumeDetail employee={serializeEmployeeDetail(employee)} editBase={null} showPdfLink={false} />
    </div>
  );
}
