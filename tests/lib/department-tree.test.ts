import { describe, expect, it, vi } from "vitest";
import { generateDepartmentCode } from "@/lib/department-tree";

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
