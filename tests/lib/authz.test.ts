import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import type { Role } from "@prisma/client";
import {
  canEditEmployee,
  canViewEmployee,
  requireManagerOrAdmin,
  resolveDepartmentLevelId,
} from "@/lib/authz";

/**
 * src/lib/authz.ts のユニットテスト。
 * docs/design/detailed-design.md 2.2 の権限判定（部署レベル解決・閲覧/編集可否）を、
 * DBに接続せずprisma.department.findUniqueをモックして検証する。
 *
 * 組織ツリー（テスト用フィクスチャ）:
 *   1(DIVISION) - 10(DEPARTMENT, 部署A) - 100(GROUP, 部署AのGr)
 *              \- 20(DEPARTMENT, 部署B) - 200(GROUP, 部署BのGr)
 *   30(DEPARTMENT, 削除済み)
 */

type FakeDepartment = {
  id: number;
  orgLevel: "DIVISION" | "DEPARTMENT" | "GROUP";
  parentId: number | null;
  deletedAt: Date | null;
};

const DEPARTMENTS: Record<number, FakeDepartment> = {
  1: { id: 1, orgLevel: "DIVISION", parentId: null, deletedAt: null },
  10: { id: 10, orgLevel: "DEPARTMENT", parentId: 1, deletedAt: null },
  100: { id: 100, orgLevel: "GROUP", parentId: 10, deletedAt: null },
  20: { id: 20, orgLevel: "DEPARTMENT", parentId: 1, deletedAt: null },
  200: { id: 200, orgLevel: "GROUP", parentId: 20, deletedAt: null },
  30: { id: 30, orgLevel: "DEPARTMENT", parentId: 1, deletedAt: new Date() },
};

const findUniqueMock = vi.fn(async ({ where }: { where: { id: number } }) => {
  return DEPARTMENTS[where.id] ?? null;
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    department: {
      findUnique: (...args: unknown[]) =>
        findUniqueMock(...(args as [{ where: { id: number } }])),
    },
  },
}));



function makeSession(role: Role, resolvedDepartmentId: number | null): Session {
  return {
    user: {
      employeeId: "000001",
      role,
      departmentId: resolvedDepartmentId,
      resolvedDepartmentId,
      name: "テスト太郎",
    },
    expires: "2099-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  findUniqueMock.mockClear();
});

describe("resolveDepartmentLevelId", () => {
  it("Grを渡すと祖先の部署(DEPARTMENT)を返す", async () => {
    await expect(resolveDepartmentLevelId(100)).resolves.toBe(10);
  });

  it("部署そのものを渡すとそのIDを返す", async () => {
    await expect(resolveDepartmentLevelId(10)).resolves.toBe(10);
  });

  it("事業部(DIVISION)止まりで部署が存在しない場合はnull", async () => {
    await expect(resolveDepartmentLevelId(1)).resolves.toBeNull();
  });

  it("departmentIdがnullの場合はnull", async () => {
    await expect(resolveDepartmentLevelId(null)).resolves.toBeNull();
  });

  it("削除済み組織はnull（安全側）", async () => {
    await expect(resolveDepartmentLevelId(30)).resolves.toBeNull();
  });

  it("存在しないIDはnull", async () => {
    await expect(resolveDepartmentLevelId(9999)).resolves.toBeNull();
  });
});

describe("canViewEmployee", () => {
  const target = { employeeId: "000999", departmentId: 100 }; // 部署A所属
  const targetOtherDept = { employeeId: "000998", departmentId: 200 }; // 部署B所属

  it("本人は常に閲覧可", async () => {
    const session = makeSession("GENERAL", 10);
    await expect(
      canViewEmployee(session, { employeeId: "000001", departmentId: 999 })
    ).resolves.toBe(true);
  });

  it.each<Role>(["MANAGER", "HR_SALES", "ADMIN"])(
    "%sは他部署の社員でも閲覧可",
    async (role) => {
      const session = makeSession(role, 10);
      await expect(canViewEmployee(session, targetOtherDept)).resolves.toBe(true);
    }
  );

  it("GENERALは自部署の社員を閲覧可", async () => {
    const session = makeSession("GENERAL", 10);
    await expect(canViewEmployee(session, target)).resolves.toBe(true);
  });

  it("GENERALは他部署の社員を閲覧不可", async () => {
    const session = makeSession("GENERAL", 10);
    await expect(canViewEmployee(session, targetOtherDept)).resolves.toBe(false);
  });

  it("GENERALでresolvedDepartmentIdが未設定(null)の場合は閲覧不可", async () => {
    const session = makeSession("GENERAL", null);
    await expect(canViewEmployee(session, target)).resolves.toBe(false);
  });
});

describe("canEditEmployee", () => {
  const target = { employeeId: "000999", departmentId: 100 }; // 部署A所属
  const targetOtherDept = { employeeId: "000998", departmentId: 200 }; // 部署B所属

  it("本人は常に編集可", async () => {
    const session = makeSession("GENERAL", 10);
    await expect(
      canEditEmployee(session, { employeeId: "000001", departmentId: 999 })
    ).resolves.toBe(true);
  });

  it("ADMINは部署に関わらず編集可", async () => {
    const session = makeSession("ADMIN", 10);
    await expect(canEditEmployee(session, target)).resolves.toBe(true);
    await expect(canEditEmployee(session, targetOtherDept)).resolves.toBe(true);
  });

  it("MANAGERは自部署の社員のみ編集可", async () => {
    const session = makeSession("MANAGER", 10);
    await expect(canEditEmployee(session, target)).resolves.toBe(true);
    await expect(canEditEmployee(session, targetOtherDept)).resolves.toBe(false);
  });

  it("HR_SALESは他人の経歴書を編集不可（自部署でも）", async () => {
    const session = makeSession("HR_SALES", 10);
    await expect(canEditEmployee(session, target)).resolves.toBe(false);
  });

  it("GENERALは他人の経歴書を編集不可", async () => {
    const session = makeSession("GENERAL", 10);
    await expect(canEditEmployee(session, target)).resolves.toBe(false);
  });
});

describe("requireManagerOrAdmin", () => {
  it.each<Role>(["ADMIN", "MANAGER"])("%sは真", (role) => {
    expect(requireManagerOrAdmin(makeSession(role, 10))).toBe(true);
  });

  it.each<Role>(["GENERAL", "HR_SALES"])("%sは偽", (role) => {
    expect(requireManagerOrAdmin(makeSession(role, 10))).toBe(false);
  });

  it("未ログイン(null)は偽", () => {
    expect(requireManagerOrAdmin(null)).toBe(false);
  });
});
