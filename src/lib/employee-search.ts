import { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  buildDepartmentTree,
  collectDescendantIds,
  loadDepartments,
  resolveDepartmentLevelIdInMemory,
} from "@/lib/department-tree";

/**
 * 経歴書一覧・横断検索（REF002 / GET /api/employees）の検索ロジック。
 * docs/design/api-design.md 2.2:
 * - 全ロールとも全社員が検索対象（認可で絞り込まない、ADR 0008）
 * - 各行にcanViewDetailを付与し、GENERALは他部署の行の詳細リンクを非活性にする
 * - 一覧行として返す項目は全ロール共通で、経歴書の全項目は含めない
 * APIルートとREF002ページ（Server Component）の両方からこのモジュールを使い、ロジックを一元化する。
 */

export type EmployeeSearchParams = {
  name?: string;
  departmentId?: number;
  experienceYearsMin?: number;
  experienceYearsMax?: number;
  skillIds: number[];
  skillMatch: "and" | "or";
  certificationIds: number[];
  certificationMatch: "and" | "or";
  siteIds: number[];
  includeDeleted: boolean;
  page: number;
  pageSize: number;
};

export type EmployeeSearchRow = {
  employeeId: string;
  name: string;
  nameKana: string;
  department: { id: number; name: string } | null;
  experienceYears: number | null;
  matchedSkills: string[];
  matchedCertifications: string[];
  matchedSites: string[];
  canViewDetail: boolean;
  deletedAt: Date | null;
};

export type EmployeeSearchResult = {
  items: EmployeeSearchRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function searchEmployees(
  session: Session,
  params: EmployeeSearchParams
): Promise<EmployeeSearchResult> {
  // 配下検索・部署レベル解決用に組織を一括ロード（削除済み含む: 削除済み組織所属の社員も検索から漏らさない）
  const departments = await loadDepartments(true);

  const conditions: Prisma.EmployeeWhereInput[] = [];

  if (!params.includeDeleted) {
    conditions.push({ deletedAt: null });
  }

  if (params.name) {
    conditions.push({
      OR: [
        { name: { contains: params.name, mode: "insensitive" } },
        { nameKana: { contains: params.name, mode: "insensitive" } },
      ],
    });
  }

  if (params.departmentId !== undefined) {
    // 事業部/部署/Grのいずれを選んでも配下組織を含めて検索する
    const ids = collectDescendantIds(departments, params.departmentId);
    conditions.push({ departmentId: { in: ids } });
  }

  if (params.experienceYearsMin !== undefined) {
    conditions.push({ experienceYears: { gte: params.experienceYearsMin } });
  }
  if (params.experienceYearsMax !== undefined) {
    conditions.push({ experienceYears: { lte: params.experienceYearsMax } });
  }

  if (params.skillIds.length > 0) {
    if (params.skillMatch === "and") {
      for (const skillId of params.skillIds) {
        conditions.push({ skillLinks: { some: { skillId, deletedAt: null } } });
      }
    } else {
      conditions.push({
        skillLinks: { some: { skillId: { in: params.skillIds }, deletedAt: null } },
      });
    }
  }

  if (params.certificationIds.length > 0) {
    if (params.certificationMatch === "and") {
      for (const certificationId of params.certificationIds) {
        conditions.push({ certifications: { some: { certificationId, deletedAt: null } } });
      }
    } else {
      conditions.push({
        certifications: {
          some: { certificationId: { in: params.certificationIds }, deletedAt: null },
        },
      });
    }
  }

  if (params.siteIds.length > 0) {
    // 「過去にどの現場に誰がいたか」検索: プロジェクト経歴に該当現場を含む社員
    conditions.push({
      projects: { some: { siteId: { in: params.siteIds }, deletedAt: null } },
    });
  }

  const where: Prisma.EmployeeWhereInput = conditions.length > 0 ? { AND: conditions } : {};

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy: { employeeId: "asc" },
      include: {
        department: { select: { id: true, departmentName: true } },
        // ヒットしたスキル/資格/現場の表示用。検索条件が無ければ in: [] で0件になる
        skillLinks: {
          where: { deletedAt: null, skillId: { in: params.skillIds } },
          include: { skill: { select: { skillName: true } } },
        },
        certifications: {
          where: { deletedAt: null, certificationId: { in: params.certificationIds } },
          include: { certification: { select: { certificationName: true } } },
        },
        projects: {
          where: { deletedAt: null, siteId: { in: params.siteIds } },
          include: { site: { select: { siteName: true } } },
        },
      },
    }),
    prisma.employee.count({ where }),
  ]);

  const departmentsById = new Map(departments.map((d) => [d.id, d]));
  const isGeneral = session.user.role === "GENERAL";

  const items: EmployeeSearchRow[] = employees.map((employee) => {
    const canViewDetail =
      !isGeneral ||
      employee.employeeId === session.user.employeeId ||
      (session.user.resolvedDepartmentId !== null &&
        resolveDepartmentLevelIdInMemory(departmentsById, employee.departmentId) ===
          session.user.resolvedDepartmentId);

    return {
      employeeId: employee.employeeId,
      name: employee.name,
      nameKana: employee.nameKana,
      department: employee.department
        ? { id: employee.department.id, name: employee.department.departmentName }
        : null,
      experienceYears: employee.experienceYears,
      matchedSkills: [...new Set(employee.skillLinks.map((l) => l.skill.skillName))],
      matchedCertifications: [
        ...new Set(employee.certifications.map((l) => l.certification.certificationName)),
      ],
      matchedSites: [...new Set(employee.projects.map((p) => p.site.siteName))],
      canViewDetail,
      deletedAt: employee.deletedAt,
    };
  });

  return { items, total, page: params.page, pageSize: params.pageSize };
}

/** REF002ページ・APIルート共通の検索フォーム用マスタ取得。 */
export async function loadSearchMasters() {
  const [departments, skills, certifications, sites] = await Promise.all([
    loadDepartments(false),
    prisma.skill.findMany({
      where: { deletedAt: null },
      orderBy: { skillName: "asc" },
      select: { id: true, skillName: true },
    }),
    prisma.certification.findMany({
      where: { deletedAt: null },
      orderBy: { certificationName: "asc" },
      select: { id: true, certificationName: true },
    }),
    prisma.site.findMany({
      where: { deletedAt: null },
      orderBy: { siteName: "asc" },
      select: { id: true, siteName: true },
    }),
  ]);

  return { departmentTree: buildDepartmentTree(departments), skills, certifications, sites };
}
