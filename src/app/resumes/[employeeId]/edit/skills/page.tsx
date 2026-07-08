import { prisma } from "@/lib/prisma";
import { serializeEmployeeDetail } from "@/lib/employee-select";
import { SkillsForm } from "@/components/resume-edit/SkillsForm";
import { Forbidden } from "@/components/Forbidden";
import { getEditContext } from "../edit-access";

type RouteParams = { params: Promise<{ employeeId: string }> };

/**
 * EDT003 スキル登録（/resumes/[employeeId]/edit/skills）。
 */
export default async function EditSkillsPage({ params }: RouteParams) {
  const { employeeId } = await params;
  const { employee, allowed } = await getEditContext(employeeId);

  if (!allowed) {
    return <Forbidden message="この社員の経歴書を編集する権限がありません" />;
  }

  const skills = await prisma.skill.findMany({
    where: { deletedAt: null },
    include: { versions: { where: { deletedAt: null }, orderBy: { versionOrder: "asc" } } },
    orderBy: { skillName: "asc" },
  });
  const serialized = serializeEmployeeDetail(employee);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">保有スキル編集</h1>
      <p className="text-sm text-slate-500">
        {serialized.name}（{employeeId}）
      </p>
      <SkillsForm
        employeeId={employeeId}
        initialSkills={serialized.skills}
        skillMasters={skills.map((s) => ({
          id: s.id,
          skillName: s.skillName,
          versions: s.versions.map((v) => ({ id: v.id, versionName: v.versionName })),
        }))}
        redirectTo={`/resumes/${employeeId}`}
      />
    </div>
  );
}
