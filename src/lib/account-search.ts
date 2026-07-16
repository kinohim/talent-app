import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { collectDescendantIds, loadDepartments } from "@/lib/department-tree";

/**
 * アカウント一覧・検索（REF007 / GET /api/accounts）。
 * docs/design/screens.md #8: 氏名（あいまい検索）、所属組織／権限／状態（複数選択）で絞込み。
 * ページ（Server Component）とAPIルートの両方から使う（employee-search.tsと同じ構成）。
 */

export type AccountStatus = "ACTIVE" | "INACTIVE";
export type AccountSortBy = "employeeId" | "name" | "department" | "role" | "status";
export type AccountSortOrder = "asc" | "desc";

export type AccountSearchParams = {
  name?: string;
  departmentIds: number[];
  roles: Role[];
  statuses: AccountStatus[];
  sortBy: AccountSortBy;
  sortOrder: AccountSortOrder;
  page: number;
  pageSize: number;
};

export type AccountSearchRow = {
  employeeId: string;
  name: string;
  nameKana: string;
  email: string;
  role: Role;
  isActive: boolean;
  department: { id: number; name: string } | null;
};

export type AccountSearchResult = {
  items: AccountSearchRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function searchAccounts(params: AccountSearchParams): Promise<AccountSearchResult> {
  const departments = await loadDepartments(true);

  const employeeWhere: Record<string, unknown> = {};
  if (params.name) {
    employeeWhere.OR = [
      { name: { contains: params.name, mode: "insensitive" } },
      { nameKana: { contains: params.name, mode: "insensitive" } },
    ];
  }
  if (params.departmentIds.length > 0) {
    const ids = [...new Set(params.departmentIds.flatMap((id) => collectDescendantIds(departments, id)))];
    employeeWhere.departmentId = { in: ids };
  }

  const userWhere: Record<string, unknown> = { employee: employeeWhere };
  if (params.roles.length > 0) {
    userWhere.role = { in: params.roles };
  }
  if (params.statuses.length > 0 && params.statuses.length < 2) {
    userWhere.isActive = params.statuses[0] === "ACTIVE";
  }

  const orderBy: Record<string, unknown> =
    params.sortBy === "name"
      ? { employee: { name: params.sortOrder } }
      : params.sortBy === "department"
        ? { employee: { department: { departmentName: params.sortOrder } } }
        : params.sortBy === "role"
          ? { role: params.sortOrder }
          : params.sortBy === "status"
            ? { isActive: params.sortOrder }
            : { employeeId: params.sortOrder };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      include: { employee: { include: { department: true } } },
      orderBy,
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.user.count({ where: userWhere }),
  ]);

  const items: AccountSearchRow[] = users.map((u) => ({
    employeeId: u.employeeId,
    name: u.employee.name,
    nameKana: u.employee.nameKana,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    department: u.employee.department
      ? { id: u.employee.department.id, name: u.employee.department.departmentName }
      : null,
  }));

  return { items, total, page: params.page, pageSize: params.pageSize };
}
