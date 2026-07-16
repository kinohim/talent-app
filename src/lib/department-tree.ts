import type { OrgLevel } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * 組織ツリー（事業部＞部署＞Gr、ADR 0007）のユーティリティ。
 * 組織テーブルは小規模なため、一括ロード＋メモリ上でのツリー操作を基本とする
 * （REF002の「配下含む検索」・GENERALのcanViewDetail判定で行数分のDBアクセスを避ける）。
 */

export type DepartmentRecord = {
  id: number;
  code: string;
  departmentName: string;
  orgLevel: OrgLevel;
  parentId: number | null;
  deletedAt: Date | null;
};

export async function loadDepartments(includeDeleted = false): Promise<DepartmentRecord[]> {
  return prisma.department.findMany({
    where: includeDeleted ? {} : { deletedAt: null },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      departmentName: true,
      orgLevel: true,
      parentId: true,
      deletedAt: true,
    },
  });
}

const DEPARTMENT_CODE_PREFIX: Record<OrgLevel, string> = {
  DIVISION: "DIV",
  DEPARTMENT: "DEP",
  GROUP: "GRP",
};

/**
 * 組織コードの自動採番（MST004: ユーザーには入力させず、階層区分ごとの連番で発行する）。
 * codeはDB全体でユニークなため、論理削除済みの行も含めて既存の最大連番を求める。
 */
export async function generateDepartmentCode(orgLevel: OrgLevel): Promise<string> {
  const prefix = DEPARTMENT_CODE_PREFIX[orgLevel];
  const existing = await prisma.department.findMany({
    where: { code: { startsWith: prefix } },
    select: { code: true },
  });

  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  const maxSeq = existing.reduce((max, { code }) => {
    const match = code.match(pattern);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `${prefix}${String(maxSeq + 1).padStart(2, "0")}`;
}

export type DepartmentTreeNode = DepartmentRecord & { children: DepartmentTreeNode[] };

/**
 * フラットな組織リストからツリーを構築する（GET /api/departments のレスポンス形式）。
 * 親が見つからないノード（親が削除済みフィルタで除外された場合等）はルート直下に
 * 出して見落としを防ぐ。
 */
export function buildDepartmentTree(records: DepartmentRecord[]): DepartmentTreeNode[] {
  const nodes = new Map<number, DepartmentTreeNode>();
  for (const record of records) {
    nodes.set(record.id, { ...record, children: [] });
  }

  const roots: DepartmentTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId !== null ? nodes.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

/** 指定組織とその配下すべてのIDを返す（REF002の所属組織検索: 配下を含めて検索）。 */
export function collectDescendantIds(records: DepartmentRecord[], rootId: number): number[] {
  const childrenByParent = new Map<number, number[]>();
  for (const record of records) {
    if (record.parentId === null) continue;
    const list = childrenByParent.get(record.parentId) ?? [];
    list.push(record.id);
    childrenByParent.set(record.parentId, list);
  }

  const result: number[] = [];
  const queue = [rootId];
  const visited = new Set<number>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);
    for (const childId of childrenByParent.get(current) ?? []) {
      queue.push(childId);
    }
  }
  return result;
}

/**
 * 部署レベル解決（deptOf）のメモリ版。src/lib/authz.ts のresolveDepartmentLevelIdと
 * 同じ規則（削除済み・未設定・部署レベル不在はnull＝安全側）で、ロード済みリストに対して判定する。
 * REF002の一覧で行ごとのDBアクセスを避けるために使う。
 */
export function resolveDepartmentLevelIdInMemory(
  records: DepartmentRecord[] | Map<number, DepartmentRecord>,
  departmentId: number | null
): number | null {
  const byId =
    records instanceof Map
      ? records
      : new Map(records.map((record) => [record.id, record]));

  let currentId = departmentId;
  const visited = new Set<number>();
  while (currentId !== null) {
    if (visited.has(currentId)) return null; // 循環データへの安全ガード
    visited.add(currentId);

    const dept = byId.get(currentId);
    if (!dept || dept.deletedAt) return null;
    if (dept.orgLevel === "DEPARTMENT") return currentId;
    currentId = dept.parentId;
  }
  return null;
}

/** 事業部/部/Grのフル階層パス文字列を作る（REF002一覧の所属組織列表示用）。 */
export function resolveDepartmentPath(
  records: DepartmentRecord[] | Map<number, DepartmentRecord>,
  departmentId: number | null
): string | null {
  const byId =
    records instanceof Map
      ? records
      : new Map(records.map((record) => [record.id, record]));

  const names: string[] = [];
  let currentId = departmentId;
  const visited = new Set<number>();
  while (currentId !== null) {
    if (visited.has(currentId)) break; // 循環データへの安全ガード
    visited.add(currentId);

    const dept = byId.get(currentId);
    if (!dept) break;
    names.unshift(dept.departmentName);
    currentId = dept.parentId;
  }
  return names.length > 0 ? names.join("/") : null;
}

export type DepartmentOption = { id: number; label: string; orgLevel: OrgLevel };

/** セレクトボックス用に階層をインデント表示したフラットな選択肢を作る。 */
export function flattenDepartmentOptions(tree: DepartmentTreeNode[]): DepartmentOption[] {
  const options: DepartmentOption[] = [];
  const walk = (nodes: DepartmentTreeNode[], depth: number) => {
    for (const node of nodes) {
      options.push({
        id: node.id,
        label: `${"　".repeat(depth)}${node.departmentName}`,
        orgLevel: node.orgLevel,
      });
      walk(node.children, depth + 1);
    }
  };
  walk(tree, 0);
  return options;
}
