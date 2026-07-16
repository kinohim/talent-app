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
  departmentName: string | null;
  canViewDetail: boolean;
};

export type DashboardSkillItem = {
  skillId: number;
  skillName: string;
  categoryId: number;
  categoryName: string;
  count: number;
  holders: DashboardHolder[];
};

export type DashboardCertificationItem = {
  certificationId: number;
  certificationName: string;
  categoryId: number;
  categoryName: string;
  count: number;
  holders: DashboardHolder[];
};

export type DashboardSummary = {
  memberCount: number;
  skillTypeCount: number;
  certCount: number;
  riskSkillCount: number;
};

export type CertificationCategorySummary = {
  categoryId: number;
  categoryName: string;
  total: number;
  legend: { certificationId: number; certificationName: string; count: number }[];
};

export type HeatmapColumn = { categoryId: number; categoryName: string };
export type HeatmapCell = { count: number; level: 0 | 1 | 2 | 3 | 4 };
export type HeatmapRow = {
  departmentId: number;
  departmentName: string;
  memberCount: number;
  cells: HeatmapCell[];
};
export type SkillCategoryHeatmap = { columns: HeatmapColumn[]; rows: HeatmapRow[] };

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
      departmentName:
        employee.departmentId !== null
          ? (departmentsById.get(employee.departmentId)?.departmentName ?? null)
          : null,
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
    {
      skillName: string;
      categoryId: number;
      categoryName: string;
      employeesById: Map<string, HolderEmployee>;
    }
  >();

  for (const link of links) {
    let entry = bySkill.get(link.skillId);
    if (!entry) {
      entry = {
        skillName: link.skill.skillName,
        categoryId: link.skill.categoryId,
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
      categoryId: entry.categoryId,
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
      categoryId: number;
      categoryName: string;
      employeesById: Map<string, HolderEmployee>;
    }
  >();

  for (const link of links) {
    let entry = byCertification.get(link.certificationId);
    if (!entry) {
      entry = {
        certificationName: link.certification.certificationName,
        categoryId: link.certification.categoryId,
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
        categoryId: entry.categoryId,
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

/**
 * ダッシュボード上部「資格別保有者数」パネル(資格カテゴリのドーナツ+凡例)用。
 * getCertificationDashboardの結果をカテゴリ単位に再集計するだけで、DBへの追加問い合わせは行わない。
 * 保有者0件のカテゴリもタブとして出せるよう、カテゴリマスタは別途全件取得する。
 */
export async function getCertificationCategorySummary(
  session: Session,
  departmentId?: number
): Promise<CertificationCategorySummary[]> {
  const [categories, items] = await Promise.all([
    prisma.certificationCategory.findMany({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
      select: { id: true, categoryName: true },
    }),
    getCertificationDashboard(session, departmentId),
  ]);

  const itemsByCategory = new Map<number, DashboardCertificationItem[]>();
  for (const item of items) {
    const list = itemsByCategory.get(item.categoryId) ?? [];
    list.push(item);
    itemsByCategory.set(item.categoryId, list);
  }

  return categories.map((category) => {
    const categoryItems = (itemsByCategory.get(category.id) ?? [])
      .slice()
      .sort((a, b) => b.count - a.count);
    return {
      categoryId: category.id,
      categoryName: category.categoryName,
      total: categoryItems.reduce((sum, item) => sum + item.count, 0),
      legend: categoryItems.slice(0, 5).map((item) => ({
        certificationId: item.certificationId,
        certificationName: item.certificationName,
        count: item.count,
      })),
    };
  });
}

/** サマリーカード「登録メンバー数」用。組織フィルタのスコープ内の在籍社員数(論理削除済みを除く)。 */
export async function getScopedMemberCount(departmentId?: number): Promise<number> {
  const { employeeDepartmentIds } = await loadScope(departmentId);
  return prisma.employee.count({
    where: {
      deletedAt: null,
      ...(employeeDepartmentIds ? { departmentId: { in: employeeDepartmentIds } } : {}),
    },
  });
}

/**
 * サマリーカード4枚分の集計。呼び出し側で既に取得済みのスキル別・資格別集計結果から
 * 純粋関数として算出する(DB再問い合わせを避ける)。
 * - skillTypeCount: スコープ内で1名以上が保有するスキルの種類数
 * - certCount: スコープ内の資格保有者数の合計(カテゴリ別集計の合計と同じ)
 * - riskSkillCount: 保有者が1名のみのスキル数(属人化リスク)
 */
export function summarizeDashboard(
  memberCount: number,
  skillItems: DashboardSkillItem[],
  certificationCategories: CertificationCategorySummary[]
): DashboardSummary {
  return {
    memberCount,
    skillTypeCount: skillItems.length,
    certCount: certificationCategories.reduce((sum, category) => sum + category.total, 0),
    riskSkillCount: skillItems.filter((item) => item.count === 1).length,
  };
}

/** 属人化リスク一覧(保有者1名のスキル)。getSkillDashboardの結果からの絞り込みのみで、追加問い合わせなし。 */
export function extractRiskSkills(skillItems: DashboardSkillItem[]): DashboardSkillItem[] {
  return skillItems.filter((item) => item.count === 1);
}

/**
 * 「部署 × スキルカテゴリ」保有者数ヒートマップ用。
 * 行は各社員の所属組織を部署レベル(orgLevel=DEPARTMENT)まで解決した結果(authz.tsのdeptOfと同じ規則、
 * department-tree.tsのメモリ版resolveDepartmentLevelIdInMemoryを使用)。事業部直下・未所属など
 * 部署レベルに解決できない社員は行の対象外(「組織の穴」の判定は部署単位が前提のため)。
 * セルは「該当部署の社員のうち、そのスキルカテゴリのスキルを1つ以上保有する人数」。
 * levelは0件固定でlevel=0、それ以外はヒートマップ全体の最大値に対する相対値で1〜4に按分する。
 */
export async function getSkillCategoryHeatmap(
  session: Session,
  departmentId?: number
): Promise<SkillCategoryHeatmap> {
  const { departments, employeeDepartmentIds } = await loadScope(departmentId);
  const departmentsById = new Map(departments.map((d) => [d.id, d]));

  const [categories, employees, links] = await Promise.all([
    prisma.skillCategory.findMany({
      where: { deletedAt: null },
      orderBy: { id: "asc" },
      select: { id: true, categoryName: true },
    }),
    prisma.employee.findMany({
      where: {
        deletedAt: null,
        ...(employeeDepartmentIds ? { departmentId: { in: employeeDepartmentIds } } : {}),
      },
      select: { employeeId: true, departmentId: true },
    }),
    prisma.employeeSkillLink.findMany({
      where: {
        deletedAt: null,
        skill: { deletedAt: null },
        employee: {
          deletedAt: null,
          ...(employeeDepartmentIds ? { departmentId: { in: employeeDepartmentIds } } : {}),
        },
      },
      select: { employeeId: true, skill: { select: { categoryId: true } } },
    }),
  ]);

  // 社員ごとに部署レベルへ解決し、部署→社員集合(行の母数)を組み立てる
  const resolvedByEmployee = new Map<string, number | null>();
  const membersByDept = new Map<number, Set<string>>();
  for (const employee of employees) {
    const resolved = resolveDepartmentLevelIdInMemory(departmentsById, employee.departmentId);
    resolvedByEmployee.set(employee.employeeId, resolved);
    if (resolved === null) continue;
    const set = membersByDept.get(resolved) ?? new Set<string>();
    set.add(employee.employeeId);
    membersByDept.set(resolved, set);
  }

  // (部署, カテゴリ) -> 保有者(社員ID)集合
  const holdersByCell = new Map<string, Set<string>>();
  for (const link of links) {
    const resolved = resolvedByEmployee.get(link.employeeId);
    if (resolved == null) continue;
    const key = `${resolved}:${link.skill.categoryId}`;
    const set = holdersByCell.get(key) ?? new Set<string>();
    set.add(link.employeeId);
    holdersByCell.set(key, set);
  }

  const rawCounts: number[] = [];
  const deptIds = [...membersByDept.keys()];
  const rows: HeatmapRow[] = deptIds.map((deptId) => {
    const cells: HeatmapCell[] = categories.map((category): HeatmapCell => {
      const count = holdersByCell.get(`${deptId}:${category.id}`)?.size ?? 0;
      rawCounts.push(count);
      return { count, level: 0 };
    });
    return {
      departmentId: deptId,
      departmentName: departmentsById.get(deptId)?.departmentName ?? "-",
      memberCount: membersByDept.get(deptId)!.size,
      cells,
    };
  });

  const maxCount = Math.max(0, ...rawCounts);
  for (const row of rows) {
    for (const cell of row.cells) {
      cell.level =
        cell.count === 0 || maxCount === 0
          ? 0
          : (Math.min(4, Math.ceil((cell.count / maxCount) * 4)) as 1 | 2 | 3 | 4);
    }
  }

  rows.sort((a, b) => a.departmentName.localeCompare(b.departmentName, "ja"));

  return {
    columns: categories.map((c) => ({ categoryId: c.id, categoryName: c.categoryName })),
    rows,
  };
}
