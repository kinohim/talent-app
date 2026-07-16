import { Prisma } from "@prisma/client";

/**
 * プロフィール閲覧・編集画面（S-07〜S-10, S-19）で共通して使う取得構造。
 * docs/design/api-design.md のPATCHリクエスト例に対応する形で返す。
 */
export const employeeDetailInclude = {
  department: true,
  nearestStation: {
    include: {
      lineLinks: { where: { deletedAt: null }, include: { line: true } },
    },
  },
  skillLinks: {
    where: { deletedAt: null },
    include: { skill: true, skillVersion: true },
  },
  certifications: {
    where: { deletedAt: null },
    include: { certification: { include: { category: true } } },
  },
  projects: {
    where: { deletedAt: null },
    include: {
      site: true,
      detail: true,
      roleLinks: { include: { projectRole: true } },
      skillLinks: { include: { skill: true, skillVersion: true } },
    },
    orderBy: { startDate: "desc" },
  },
} satisfies Prisma.EmployeeInclude;

export type EmployeeDetail = Prisma.EmployeeGetPayload<{
  include: typeof employeeDetailInclude;
}>;

export function serializeEmployeeDetail(employee: EmployeeDetail) {
  return {
    employeeId: employee.employeeId,
    name: employee.name,
    nameKana: employee.nameKana,
    birthDate: employee.birthDate,
    gender: employee.gender,
    departmentId: employee.departmentId,
    departmentName: employee.department?.departmentName ?? null,
    nearestStationId: employee.nearestStationId,
    nearestStationName: employee.nearestStation?.stationName ?? null,
    // 1駅に複数路線が乗り入れるケースがあるため配列で返す（REF003: 路線名+駅名表示）
    nearestStationLines: employee.nearestStation?.lineLinks.map((l) => l.line.lineName) ?? [],
    hireDate: employee.hireDate,
    careerSummary: employee.careerSummary,
    selfPr: employee.selfPr,
    finalSchoolName: employee.finalSchoolName,
    finalDepartmentName: employee.finalDepartmentName,
    finalSchoolType: employee.finalSchoolType,
    graduationYearMonth: employee.graduationYearMonth,
    graduationStatus: employee.graduationStatus,
    deletedAt: employee.deletedAt,
    skills: employee.skillLinks.map((link) => ({
      skillId: link.skillId,
      skillName: link.skill.skillName,
      skillVersionId: link.skillVersionId,
      skillVersionName: link.skillVersion?.versionName ?? null,
      skillLevel: link.skillLevel,
    })),
    certifications: employee.certifications.map((link) => ({
      id: link.id,
      certificationId: link.certificationId,
      certificationName: link.certification.certificationName,
      categoryName: link.certification.category.categoryName,
      acquiredDate: link.acquiredDate,
      expirationDate: link.expirationDate,
    })),
    projects: employee.projects.map((project) => ({
      id: project.id,
      siteId: project.siteId,
      siteName: project.site.siteName,
      projectTitle: project.projectTitle,
      projectSummary: project.projectSummary,
      startDate: project.startDate,
      endDate: project.endDate,
      totalTeamSize: project.totalTeamSize,
      teamSize: project.teamSize,
      roles: project.roleLinks.map((rl) => ({
        projectRoleId: rl.projectRoleId,
        roleName: rl.projectRole.roleName,
      })),
      skills: project.skillLinks.map((sl) => ({
        skillId: sl.skillId,
        skillName: sl.skill.skillName,
        skillVersionId: sl.skillVersionId,
        skillVersionName: sl.skillVersion?.versionName ?? null,
      })),
      detail: project.detail,
    })),
  };
}
