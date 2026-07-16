import { describe, expect, it, vi } from "vitest";
import { generateDepartmentCode, resolveDepartmentPath, type DepartmentRecord } from "@/lib/department-tree";

/**
 * src/lib/department-tree.ts の組織コード自動採番ロジックのユニットテスト。
 * MST004: 組織コードはユーザー入力させず、階層区分ごとの連番（DIV/DEP/GRPの2桁ゼロ埋め）で発行する。
 * codeはDB全体でユニークなため、論理削除済みの行も含めて既存の最大連番を求める必要がある。
 */

let departmentCodes: { code: string }[] = [];

const findManyMock = vi.fn(async ({ where }: { where: { code: { startsWith: string } } }) =>
  departmentCodes.filter((d) => d.code.startsWith(where.code.startsWith))
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    department: {
      findMany: (...args: unknown[]) => findManyMock(...(args as [{ where: { code: { startsWith: string } } }])),
    },
  },
}));

describe("generateDepartmentCode", () => {
  it("該当階層のコードが1件もない場合は連番01を発行する", async () => {
    departmentCodes = [];
    await expect(generateDepartmentCode("DIVISION")).resolves.toBe("DIV01");
  });

  it("既存の最大連番の次の番号を発行する", async () => {
    departmentCodes = [{ code: "DEP01" }, { code: "DEP02" }, { code: "DEP04" }];
    await expect(generateDepartmentCode("DEPARTMENT")).resolves.toBe("DEP05");
  });

  it("論理削除済みの行のコードも欠番として考慮する（DB全体のユニーク制約のため）", async () => {
    departmentCodes = [{ code: "GRP01" }];
    await expect(generateDepartmentCode("GROUP")).resolves.toBe("GRP02");
  });

  it("階層区分ごとにプレフィックスが異なり連番も独立する", async () => {
    departmentCodes = [{ code: "DIV01" }, { code: "DIV02" }, { code: "DEP01" }];
    await expect(generateDepartmentCode("DIVISION")).resolves.toBe("DIV03");
  });
});

/**
 * resolveDepartmentPath: REF002一覧の所属組織列を「事業部/部/Gr」のフル階層表示にするためのユーティリティ。
 */
describe("resolveDepartmentPath", () => {
  const division: DepartmentRecord = {
    id: 1,
    code: "DIV01",
    departmentName: "システム事業部",
    orgLevel: "DIVISION",
    parentId: null,
    deletedAt: null,
  };
  const department: DepartmentRecord = {
    id: 2,
    code: "DEP01",
    departmentName: "開発部",
    orgLevel: "DEPARTMENT",
    parentId: 1,
    deletedAt: null,
  };
  const group: DepartmentRecord = {
    id: 3,
    code: "GRP01",
    departmentName: "第一Gr",
    orgLevel: "GROUP",
    parentId: 2,
    deletedAt: null,
  };
  const records = [division, department, group];

  it("Grまで所属している場合は事業部/部/Grを/で結合する", () => {
    expect(resolveDepartmentPath(records, group.id)).toBe("システム事業部/開発部/第一Gr");
  });

  it("部署までの所属なら2階層のみを結合する", () => {
    expect(resolveDepartmentPath(records, department.id)).toBe("システム事業部/開発部");
  });

  it("未所属(null)はnullを返す", () => {
    expect(resolveDepartmentPath(records, null)).toBeNull();
  });

  it("循環データがあっても無限ループせずに打ち切る", () => {
    const cyclic: DepartmentRecord[] = [
      { ...division, id: 10, parentId: 11 },
      { ...department, id: 11, parentId: 10 },
    ];
    expect(() => resolveDepartmentPath(cyclic, 10)).not.toThrow();
  });
});
