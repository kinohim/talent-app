import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeEmployeeDetail } from "@/lib/employee-select";
import { ProjectsForm } from "@/components/resume-edit/ProjectsForm";
import { Forbidden } from "@/components/Forbidden";
import { getEditContext } from "../../edit-access";

type RouteParams = { params: Promise<{ employeeId: string; projectId: string }> };

/**
 * EDT005 プロジェクト経歴編集（/resumes/[employeeId]/edit/projects/[projectId]）。
 * REF006の一覧で選択した1件のみを編集する（他のプロジェクトは表示しない、screens.md #7）。
 */
export default async function EditSingleProjectPage({ params }: RouteParams) {
  const { employeeId, projectId } = await params;
  const { employee, allowed } = await getEditContext(employeeId);

  if (!allowed) {
    return <Forbidden message="この社員の経歴書を編集する権限がありません" />;
  }

  const targetId = Number(projectId);
  if (!Number.isInteger(targetId)) notFound();

  const [sites, roles, skills] = await Promise.all([
    prisma.site.findMany({ where: { deletedAt: null }, orderBy: { siteName: "asc" } }),
    prisma.projectRole.findMany({ where: { deletedAt: null }, orderBy: { roleName: "asc" } }),
    prisma.skill.findMany({
      where: { deletedAt: null },
      include: { versions: { where: { deletedAt: null }, orderBy: { versionOrder: "asc" } } },
      orderBy: { skillName: "asc" },
    }),
  ]);
  const serialized = serializeEmployeeDetail(employee);

  const target = serialized.projects.find((p) => p.id === targetId);
  if (!target) notFound();
  const others = serialized.projects.filter((p) => p.id !== targetId);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">現場（プロジェクト）経歴編集</h1>
      <p className="text-sm text-slate-500">
        {serialized.name}（{employeeId}）
      </p>
      <ProjectsForm
        employeeId={employeeId}
        initialProject={target}
        otherProjects={others}
        siteMasters={sites.map((s) => ({ id: s.id, siteName: s.siteName }))}
        roleMasters={roles.map((r) => ({ id: r.id, roleName: r.roleName }))}
        skillMasters={skills.map((s) => ({
          id: s.id,
          skillName: s.skillName,
          versions: s.versions.map((v) => ({ id: v.id, versionName: v.versionName })),
        }))}
        redirectTo={`/mypage/projects`}
      />
    </div>
  );
}
