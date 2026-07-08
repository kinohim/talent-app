import { prisma } from "@/lib/prisma";
import { serializeEmployeeDetail } from "@/lib/employee-select";
import { ProjectsForm } from "@/components/resume-edit/ProjectsForm";
import { Forbidden } from "@/components/Forbidden";
import { getEditContext } from "../edit-access";

type RouteParams = { params: Promise<{ employeeId: string }> };

/**
 * EDT005 プロジェクト経歴登録（/resumes/[employeeId]/edit/projects）。
 * 期間・現場（現場マスタ）・役割（現場ポジションマスタ、複数）・規模・担当工程・使用スキルを
 * 登録・編集する（screens.md #14、detailed-design.md EDT005）。
 */
export default async function EditProjectsPage({ params }: RouteParams) {
  const { employeeId } = await params;
  const { employee, allowed } = await getEditContext(employeeId);

  if (!allowed) {
    return <Forbidden message="この社員の経歴書を編集する権限がありません" />;
  }

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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">現場（プロジェクト）経歴編集</h1>
      <p className="text-sm text-slate-500">
        {serialized.name}（{employeeId}）
      </p>
      <ProjectsForm
        employeeId={employeeId}
        initialProjects={serialized.projects.map((p) => ({
          siteId: p.siteId,
          projectTitle: p.projectTitle,
          projectSummary: p.projectSummary,
          startDate: p.startDate,
          endDate: p.endDate,
          totalTeamSize: p.totalTeamSize,
          teamSize: p.teamSize,
          roles: p.roles.map((r) => ({ projectRoleId: r.projectRoleId })),
          skills: p.skills.map((s) => ({ skillId: s.skillId, skillVersionId: s.skillVersionId })),
          detail: p.detail
            ? {
                overview: p.detail.overview,
                researchAnalysis: p.detail.researchAnalysis,
                requirementsDefinition: p.detail.requirementsDefinition,
                basicDesign: p.detail.basicDesign,
                detailedDesign: p.detail.detailedDesign,
                development: p.detail.development,
                testing: p.detail.testing,
                operation: p.detail.operation,
              }
            : null,
        }))}
        siteMasters={sites.map((s) => ({ id: s.id, siteName: s.siteName }))}
        roleMasters={roles.map((r) => ({ id: r.id, roleName: r.roleName }))}
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
