import { describe, expect, it, vi } from "vitest";
import { generateSkillCategoryCode, generateCertificationCategoryCode } from "@/lib/category-code";

/**
 * src/lib/category-code.ts のカテゴリコード自動採番ロジックのユニットテスト。
 * MST001/002: カテゴリコードはユーザー入力させず、種別ごとの連番(SKC/CTC + 2桁ゼロ埋め)で発行し
 * 画面には表示しない（xlsxレビュー指摘対応、2026-07）。
 */

let skillCategoryCodes: { code: string }[] = [];
let certificationCategoryCodes: { code: string }[] = [];

const skillFindManyMock = vi.fn(async ({ where }: { where: { code: { startsWith: string } } }) =>
  skillCategoryCodes.filter((c) => c.code.startsWith(where.code.startsWith))
);
const certificationFindManyMock = vi.fn(async ({ where }: { where: { code: { startsWith: string } } }) =>
  certificationCategoryCodes.filter((c) => c.code.startsWith(where.code.startsWith))
);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    skillCategory: {
      findMany: (...args: unknown[]) => skillFindManyMock(...(args as [{ where: { code: { startsWith: string } } }])),
    },
    certificationCategory: {
      findMany: (...args: unknown[]) =>
        certificationFindManyMock(...(args as [{ where: { code: { startsWith: string } } }])),
    },
  },
}));

describe("generateSkillCategoryCode", () => {
  it("該当コードが1件もない場合は連番01を発行する", async () => {
    skillCategoryCodes = [];
    await expect(generateSkillCategoryCode()).resolves.toBe("SKC01");
  });

  it("既存の最大連番の次の番号を発行する（論理削除済みも含めて欠番として考慮）", async () => {
    skillCategoryCodes = [{ code: "SKC01" }, { code: "SKC02" }, { code: "SKC04" }];
    await expect(generateSkillCategoryCode()).resolves.toBe("SKC05");
  });
});

describe("generateCertificationCategoryCode", () => {
  it("該当コードが1件もない場合は連番01を発行する", async () => {
    certificationCategoryCodes = [];
    await expect(generateCertificationCategoryCode()).resolves.toBe("CTC01");
  });

  it("既存の最大連番の次の番号を発行する", async () => {
    certificationCategoryCodes = [{ code: "CTC01" }];
    await expect(generateCertificationCategoryCode()).resolves.toBe("CTC02");
  });

  it("プレフィックスが異なるためskillカテゴリの連番とは独立する", async () => {
    skillCategoryCodes = [{ code: "SKC01" }, { code: "SKC02" }, { code: "SKC03" }];
    certificationCategoryCodes = [{ code: "CTC01" }];
    await expect(generateCertificationCategoryCode()).resolves.toBe("CTC02");
  });
});
