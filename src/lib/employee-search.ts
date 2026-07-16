import { Prisma } from "@prisma/client";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  buildDepartmentTree,
  collectDescendantIds,
  loadDepartments,
  resolveDepartmentLevelIdInMemory,
  resolveDepartmentPath,
} from "@/lib/department-tree";

/**
 * 経歴書一覧・横断検索（REF002 / GET /api/employees）の検索ロジック。
 * docs/design/api-design.md 2.2:
 * - 全ロールとも全社員が検索対象（認可で絞り込まない、ADR 0008）
 * - 各行にcanViewDetailを付与し、GENERALは他部署の行の詳細リンクを非活性にする
 * - 一覧行として返す項目は全ロール共通で、経歴書の全項目は含めない
 * APIルートとREF002ページ（Server Component）の両方からこのモジュールを使い、ロジックを一元化する。
 */

export type EmployeeSortBy = "employeeId" | "name" | "department" | "hireDate";
export type SortOrder = "asc" | "desc";

export type EmployeeSearchParams = {
  name?: string;
  departmentId?: number;
  hireDateFrom?: string;
  hireDateTo?: string;
  skillIds: number[];
  skillMatch: "and" | "or";
  certificationIds: number[];
  certificationMatch: "and" | "or";
  siteIds: number[];
  siteScope: "current" | "all";
  sortBy: EmployeeSortBy;
  sortOrder: SortOrder;
  page: number;
  pageSize: number;
};

export type EmployeeSearchRow = {
  employeeId: string;
  name: string;
  nameKana: string;
  department: { id: number; name: string; path: string } | null;
  hireDate: Date | null;
  allSkills: string[];
  allCertifications: string[];
  matchedSkills: string[];
  matchedCertifications: string[];
  matchedSites: string[];
  canViewDetail: boolean;
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

  const conditions: Prisma.EmployeeWhereInput[] = [{ deletedAt: null }];

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

  if (params.hireDateFrom !== undefined) {
    conditions.push({ hireDate: { gte: new Date(params.hireDateFrom) } });
  }
  if (params.hireDateTo !== undefined) {
    conditions.push({ hireDate: { lte: new Date(params.hireDateTo) } });
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
    // 「現在のみ」= 現在進行中(end_date=NULL)のプロジェクトのみ。「過去を含む」= 過去にその現場にいた社員も含む
    conditions.push({
      projects: {
        some: {
          siteId: { in: params.siteIds },
          deletedAt: null,
          ...(params.siteScope === "current" ? { endDate: null } : {}),
        },
      },
    });
  }

  const where: Prisma.EmployeeWhereInput = { AND: conditions };

  const orderBy: Prisma.EmployeeOrderByWithRelationInput =
    params.sortBy === "department"
      ? { department: { departmentName: params.sortOrder } }
      : { [params.sortBy]: params.sortOrder };

  const [employees, total] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
      orderBy,
      include: {
        department: { select: { id: true, departmentName: true } },
        skillLinks: {
          where: { deletedAt: null },
          include: { skill: { select: { id: true, skillName: true } } },
        },
        certifications: {
          where: { deletedAt: null },
          include: { certification: { select: { id: true, certificationName: true } } },
        },
        projects: {
          where: {
            deletedAt: null,
            siteId: { in: params.siteIds },
            ...(params.siteScope === "current" ? { endDate: null } : {}),
          },
          include: { site: { select: { siteName: true } } },
        },
      },
    }),
    prisma.employee.count({ where }),
  ]);

  const departmentsById = new Map(departments.map((d) => [d.id, d]));
  const isGeneral = session.user.role === "GENERAL";
  const skillIdSet = new Set(params.skillIds);
  const certificationIdSet = new Set(params.certificationIds);

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
        ? {
            id: employee.department.id,
            name: employee.department.departmentName,
            path: resolveDepartmentPath(departmentsById, employee.departmentId) ?? employee.department.departmentName,
          }
        : null,
      hireDate: employee.hireDate,
      allSkills: [...new Set(employee.skillLinks.map((l) => l.skill.skillName))],
      allCertifications: [
        ...new Set(employee.certifications.map((l) => l.certification.certificationName)),
      ],
      matchedSkills: [
        ...new Set(
          employee.skillLinks.filter((l) => skillIdSet.has(l.skill.id)).map((l) => l.skill.skillName)
        ),
      ],
      matchedCertifications: [
        ...new Set(
          employee.certifications
            .filter((l) => certificationIdSet.has(l.certification.id))
            .map((l) => l.certification.certificationName)
        ),
      ],
      matchedSites: [...new Set(employee.projects.map((p) => p.site.siteName))],
      canViewDetail,
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
