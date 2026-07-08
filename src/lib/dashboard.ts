import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import {
  collectDescendantIds,
  loadDepartments,
  resolveDepartmentLevelIdInMemory,
  type DepartmentRecord,
} from "@/lib/department-tree";

/**
 * REF008 スキルマップ／組織ダッシュボードの集計ロジック。
 * docs/design/api-design.md 2.3:
 * - 組織単位（事業部/部署/Gr、departmentIdクエリ。省略時は全社）ごとのスキル・資格の
 *   保有者数集計と保有者名一覧を返す
 * - 保有者名は全ロールに返すが、各名前にcanViewDetailを付与する（REF002・ADR 0008と同じ扱い）
 * GET /api/dashboard/skills・/api/dashboard/certifications と /dashboard ページの両方から使う。
 */

export type DashboardHolder = {
  employeeId: string;
  name: string;
  canViewDetail: boolean;
};

export type DashboardSkillItem = {
  skillId: number;
  skillName: string;
  categoryName: string;
  count: number;
  holders: DashboardHolder[];
};

export type DashboardCertificationItem = {
  certificationId: number;
  certificationName: string;
  categoryName: string;
  count: number;
  holders: DashboardHolder[];
};

type HolderEmployee = { employeeId: string; name: string; departmentId: number | null };

async function loadScope(departmentId?: number) {
  // 部署レベル解決・配下検索用に組織を一括ロード（削除済みも含める。employee-search.tsと同じ考え方）
  const departments = await loadDepartments(true);
  const employeeDepartmentIds =
    departmentId !== undefined ? collectDescendantIds(departments, departmentId) : undefined;
  return { departments, employeeDepartmentIds };
}

function buildHolders(
  session: Session,
  departments: DepartmentRecord[],
  employees: HolderEmployee[]
): DashboardHolder[] {
  const departmentsById = new Map(departments.map((d) => [d.id, d]));
  const isGeneral = session.user.role === "GENERAL";

  return employees
    .map((employee) => ({
      employeeId: employee.employeeId,
      name: employee.name,
      canViewDetail:
        !isGeneral ||
        employee.employeeId === session.user.employeeId ||
        (session.user.resolvedDepartmentId !== null &&
          resolveDepartmentLevelIdInMemory(departmentsById, employee.departmentId) ===
            session.user.resolvedDepartmentId),
    }))
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId));
}

export async function getSkillDashboard(
  session: Session,
  departmentId?: number
): Promise<DashboardSkillItem[]> {
  const { departments, employeeDepartmentIds } = await loadScope(departmentId);

  const links = await prisma.employeeSkillLink.findMany({
    where: {
      deletedAt: null,
      skill: { deletedAt: null },
      employee: {
        deletedAt: null,
        ...(employeeDepartmentIds ? { departmentId: { in: employeeDepartmentIds } } : {}),
      },
    },
    include: {
      skill: { include: { category: true } },
      employee: { select: { employeeId: true, name: true, departmentId: true } },
    },
  });

  const bySkill = new Map<
    number,
    { skillName: string; categoryName: string; employeesById: Map<string, HolderEmployee> }
  >();

  for (const link of links) {
    let entry = bySkill.get(link.skillId);
    if (!entry) {
      entry = {
        skillName: link.skill.skillName,
        categoryName: link.skill.category.categoryName,
        employeesById: new Map(),
      };
      bySkill.set(link.skillId, entry);
    }
    entry.employeesById.set(link.employee.employeeId, link.employee);
  }

  const items: DashboardSkillItem[] = [...bySkill.entries()].map(([skillId, entry]) => {
    const employees = [...entry.employeesById.values()];
    return {
      skillId,
      skillName: entry.skillName,
      categoryName: entry.categoryName,
      count: employees.length,
      holders: buildHolders(session, departments, employees),
    };
  });

  items.sort((a, b) => b.count - a.count || a.skillName.localeCompare(b.skillName, "ja"));
  return items;
}

export async function getCertificationDashboard(
  session: Session,
  departmentId?: number
): Promise<DashboardCertificationItem[]> {
  const { departments, employeeDepartmentIds } = await loadScope(departmentId);

  const links = await prisma.employeeCertificationLink.findMany({
    where: {
      deletedAt: null,
      certification: { deletedAt: null },
      employee: {
        deletedAt: null,
        ...(employeeDepartmentIds ? { departmentId: { in: employeeDepartmentIds } } : {}),
      },
    },
    include: {
      certification: { include: { category: true } },
      employee: { select: { employeeId: true, name: true, departmentId: true } },
    },
  });

  const byCertification = new Map<
    number,
    {
      certificationName: string;
      categoryName: string;
      employeesById: Map<string, HolderEmployee>;
    }
  >();

  for (const link of links) {
    let entry = byCertification.get(link.certificationId);
    if (!entry) {
      entry = {
        certificationName: link.certification.certificationName,
        categoryName: link.certification.category.categoryName,
        employeesById: new Map(),
      };
      byCertification.set(link.certificationId, entry);
    }
    // 再取得履歴で複数行あり得るが、保有者一覧としては同一社員は1件にまとめる
    entry.employeesById.set(link.employee.employeeId, link.employee);
  }

  const items: DashboardCertificationItem[] = [...byCertification.entries()].map(
    ([certificationId, entry]) => {
      const employees = [...entry.employeesById.values()];
      return {
        certificationId,
        certificationName: entry.certificationName,
        categoryName: entry.categoryName,
        count: employees.length,
        holders: buildHolders(session, departments, employees),
      };
    }
  );

  items.sort(
    (a, b) => b.count - a.count || a.certificationName.localeCompare(b.certificationName, "ja")
  );
  return items;
}
