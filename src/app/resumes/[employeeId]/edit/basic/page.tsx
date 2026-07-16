import { prisma } from "@/lib/prisma";
import { canEditDepartmentField } from "@/lib/authz";
import { serializeEmployeeDetail } from "@/lib/employee-select";
import { buildDepartmentTree, flattenDepartmentOptions, loadDepartments } from "@/lib/department-tree";
import { BasicInfoForm } from "@/components/resume-edit/BasicInfoForm";
import { Forbidden } from "@/components/Forbidden";
import { getEditContext } from "../edit-access";

type RouteParams = { params: Promise<{ employeeId: string }> };

/**
 * EDT001〜004 基本情報・経歴概要・保有スキル・保有資格の統合編集画面（/resumes/[employeeId]/edit/basic）。
 * マイページの編集メニューを1本化するため、EDT002〜004をこの画面に統合している。
 * 権限チェックはgetEditContext（一次: 未ログイン/存在チェック、最終判定はPATCH API側）。
 */
export default async function EditBasicPage({ params }: RouteParams) {
  const { employeeId } = await params;
  const { session, employee, allowed } = await getEditContext(employeeId);

  if (!allowed) {
    return <Forbidden message="この社員の経歴書を編集する権限がありません" />;
  }

  const [departmentRecords, skills, certifications] = await Promise.all([
    loadDepartments(false),
    prisma.skill.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { deletedAt: null }, orderBy: { versionOrder: "asc" } } },
      orderBy: { skillName: "asc" },
    }),
    prisma.certification.findMany({
      where: { deletedAt: null },
      include: { category: true },
      orderBy: { certificationName: "asc" },
    }),
  ]);
  const departmentOptions = flattenDepartmentOptions(buildDepartmentTree(departmentRecords));
  const serialized = serializeEmployeeDetail(employee);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">基本情報・経歴書編集</h1>
      <p className="text-sm text-slate-500">
        {serialized.name}（{employeeId}）
      </p>
      <BasicInfoForm
        initialData={serialized}
        canEditDepartment={canEditDepartmentField(session)}
        departments={departmentOptions}
        skillMasters={skills.map((s) => ({
          id: s.id,
          skillName: s.skillName,
          versions: s.versions.map((v) => ({ id: v.id, versionName: v.versionName })),
        }))}
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
