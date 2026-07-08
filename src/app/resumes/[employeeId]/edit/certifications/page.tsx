import { prisma } from "@/lib/prisma";
import { serializeEmployeeDetail } from "@/lib/employee-select";
import { CertificationsForm } from "@/components/resume-edit/CertificationsForm";
import { Forbidden } from "@/components/Forbidden";
import { getEditContext } from "../edit-access";

type RouteParams = { params: Promise<{ employeeId: string }> };

/**
 * EDT004 資格登録（/resumes/[employeeId]/edit/certifications）。
 */
export default async function EditCertificationsPage({ params }: RouteParams) {
  const { employeeId } = await params;
  const { employee, allowed } = await getEditContext(employeeId);

  if (!allowed) {
    return <Forbidden message="この社員の経歴書を編集する権限がありません" />;
  }

  const certifications = await prisma.certification.findMany({
    where: { deletedAt: null },
    include: { category: true },
    orderBy: { certificationName: "asc" },
  });
  const serialized = serializeEmployeeDetail(employee);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">保有資格編集</h1>
      <p className="text-sm text-slate-500">
        {serialized.name}（{employeeId}）
      </p>
      <CertificationsForm
        employeeId={employeeId}
        initialCertifications={serialized.certifications}
        certificationMasters={certifications.map((c) => ({
          id: c.id,
          certificationName: c.certificationName,
          categoryName: c.category.categoryName,
        }))}
        redirectTo={`/resumes/${employeeId}`}
      />
    </div>
  );
}
