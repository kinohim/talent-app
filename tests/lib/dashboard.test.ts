import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import {
  extractRiskSkills,
  getCertificationCategorySummary,
  getSkillCategoryHeatmap,
  getSkillDashboard,
  summarizeDashboard,
} from "@/lib/dashboard";

/**
 * src/lib/dashboard.ts のうち、今回REF008の可視化強化(サマリー・資格カテゴリ集計・
 * 部署×スキルカテゴリのヒートマップ・属人化リスク抽出)で追加したロジックのユニットテスト。
 * 既存のgetSkillDashboard/getCertificationDashboardはprisma.findManyの結果をそのまま集計するだけの
 * 関数なので、追加関数がその結果を正しく再集計・抽出できることを検証する。
 *
 * 組織ツリー（テスト用フィクスチャ）:
 *   1(DIVISION, システム事業部) - 10(DEPARTMENT, 開発部) - 100(GROUP, 第一Gr)
 *                              \- 20(DEPARTMENT, 営業部)
 *
 * 社員:
 *   000001(第一Gr所属 → 部署レベルは開発部10) 000002(開発部10直属) 000003(営業部20所属)
 *   000004(所属未設定 → 部署レベル解決不可、ヒートマップの行対象外)
 *
 * フィクスチャ・モック関数はすべてvi.hoisted()内にまとめている。vi.mock()はファイル先頭へ
 * 巻き上げられるため、ファクトリが参照する値も同じ巻き上げ対象にしないとTDZエラーになる。
 */
const {
  departmentFindManyMock,
  employeeFindManyMock,
  employeeCountMock,
  skillLinkFindManyMock,
  certificationLinkFindManyMock,
  skillCategoryFindManyMock,
  certificationCategoryFindManyMock,
} = vi.hoisted(() => {
  type FakeDepartment = {
    id: number;
    code: string;
    departmentName: string;
    orgLevel: "DIVISION" | "DEPARTMENT" | "GROUP";
    parentId: number | null;
    deletedAt: Date | null;
  };

  const DEPARTMENTS: FakeDepartment[] = [
    { id: 1, code: "DIV01", departmentName: "システム事業部", orgLevel: "DIVISION", parentId: null, deletedAt: null },
    { id: 10, code: "DEP01", departmentName: "開発部", orgLevel: "DEPARTMENT", parentId: 1, deletedAt: null },
    { id: 100, code: "GRP01", departmentName: "第一Gr", orgLevel: "GROUP", parentId: 10, deletedAt: null },
    { id: 20, code: "DEP02", departmentName: "営業部", orgLevel: "DEPARTMENT", parentId: 1, deletedAt: null },
  ];

  type FakeEmployee = { employeeId: string; name: string; departmentId: number | null };

  const EMPLOYEES: FakeEmployee[] = [
    { employeeId: "000001", name: "社員一", departmentId: 100 },
    { employeeId: "000002", name: "社員二", departmentId: 10 },
    { employeeId: "000003", name: "社員三", departmentId: 20 },
    { employeeId: "000004", name: "社員四", departmentId: null },
  ];

  const employeeById = new Map(EMPLOYEES.map((e) => [e.employeeId, e]));

  const SKILL_CATEGORIES = [
    { id: 1, categoryName: "プログラミング言語" },
    { id: 2, categoryName: "クラウド" },
    { id: 3, categoryName: "データベース" }, // 保有者0件のカテゴリ
  ];

  const CERTIFICATION_CATEGORIES = [
    { id: 1, categoryName: "国家資格" },
    { id: 2, categoryName: "ベンダー" },
    { id: 3, categoryName: "その他" }, // 保有者0件のカテゴリ
  ];

  // skillId=1 Java(カテゴリ1): 000001,000002が保有 → 2名
  // skillId=2 AWS(カテゴリ2): 000003のみ保有 → 1名(属人化リスク)
  // skillId=3 Go(カテゴリ1): 000001のみ保有 → 1名(属人化リスク)
  const SKILL_LINKS = [
    {
      employeeId: "000001",
      skillId: 1,
      skill: { skillName: "Java", categoryId: 1, category: { categoryName: "プログラミング言語" } },
      employee: employeeById.get("000001"),
    },
    {
      employeeId: "000002",
      skillId: 1,
      skill: { skillName: "Java", categoryId: 1, category: { categoryName: "プログラミング言語" } },
      employee: employeeById.get("000002"),
    },
    {
      employeeId: "000003",
      skillId: 2,
      skill: { skillName: "AWS", categoryId: 2, category: { categoryName: "クラウド" } },
      employee: employeeById.get("000003"),
    },
    {
      employeeId: "000001",
      skillId: 3,
      skill: { skillName: "Go", categoryId: 1, category: { categoryName: "プログラミング言語" } },
      employee: employeeById.get("000001"),
    },
  ];

  // certificationId=1 基本情報(カテゴリ1): 000001,000002が保有 → 2名
  // certificationId=2 AWS認定(カテゴリ2): 000003のみ保有 → 1名
  const CERTIFICATION_LINKS = [
    {
      employeeId: "000001",
      certificationId: 1,
      certification: {
        certificationName: "基本情報技術者",
        categoryId: 1,
        category: { categoryName: "国家資格" },
      },
      employee: employeeById.get("000001"),
    },
    {
      employeeId: "000002",
      certificationId: 1,
      certification: {
        certificationName: "基本情報技術者",
        categoryId: 1,
        category: { categoryName: "国家資格" },
      },
      employee: employeeById.get("000002"),
    },
    {
      employeeId: "000003",
      certificationId: 2,
      certification: {
        certificationName: "AWS認定",
        categoryId: 2,
        category: { categoryName: "ベンダー" },
      },
      employee: employeeById.get("000003"),
    },
  ];

  function scopedDepartmentIds(where: Record<string, unknown> | undefined): number[] | undefined {
    const nested = (where?.employee as Record<string, unknown> | undefined)?.departmentId as
      | { in?: number[] }
      | undefined;
    const direct = where?.departmentId as { in?: number[] } | undefined;
    return nested?.in ?? direct?.in;
  }

  function inScope(departmentId: number | null, scopeIds: number[] | undefined): boolean {
    if (scopeIds === undefined) return true;
    return departmentId !== null && scopeIds.includes(departmentId);
  }

  return {
    departmentFindManyMock: vi.fn(async () => DEPARTMENTS),
    employeeFindManyMock: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
      const scopeIds = scopedDepartmentIds(where);
      return EMPLOYEES.filter((e) => inScope(e.departmentId, scopeIds));
    }),
    employeeCountMock: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
      const scopeIds = scopedDepartmentIds(where);
      return EMPLOYEES.filter((e) => inScope(e.departmentId, scopeIds)).length;
    }),
    skillLinkFindManyMock: vi.fn(async ({ where }: { where?: Record<string, unknown> }) => {
      const scopeIds = scopedDepartmentIds(where);
      return SKILL_LINKS.filter((link) => inScope(link.employee?.departmentId ?? null, scopeIds));
    }),
    certificationLinkFindManyMock: vi.fn(
      async ({ where }: { where?: Record<string, unknown> }) => {
        const scopeIds = scopedDepartmentIds(where);
        return CERTIFICATION_LINKS.filter((link) =>
          inScope(link.employee?.departmentId ?? null, scopeIds)
        );
      }
    ),
    skillCategoryFindManyMock: vi.fn(async () => SKILL_CATEGORIES),
    certificationCategoryFindManyMock: vi.fn(async () => CERTIFICATION_CATEGORIES),
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    department: { findMany: departmentFindManyMock },
    employee: { findMany: employeeFindManyMock, count: employeeCountMock },
    employeeSkillLink: { findMany: skillLinkFindManyMock },
    employeeCertificationLink: { findMany: certificationLinkFindManyMock },
    skillCategory: { findMany: skillCategoryFindManyMock },
    certificationCategory: { findMany: certificationCategoryFindManyMock },
  },
}));

function makeSession(): Session {
  return {
    user: {
      employeeId: "000999",
      role: "ADMIN",
      departmentId: null,
      resolvedDepartmentId: null,
      name: "管理職太郎",
    },
    expires: "2099-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  departmentFindManyMock.mockClear();
  employeeFindManyMock.mockClear();
  employeeCountMock.mockClear();
  skillLinkFindManyMock.mockClear();
  certificationLinkFindManyMock.mockClear();
  skillCategoryFindManyMock.mockClear();
  certificationCategoryFindManyMock.mockClear();
});

describe("extractRiskSkills", () => {
  it("保有者が1名のスキルのみ抽出する", async () => {
    const session = makeSession();
    const skillItems = await getSkillDashboard(session);
    const risk = extractRiskSkills(skillItems);

    expect(risk.map((s) => s.skillName).sort()).toEqual(["AWS", "Go"]);
    expect(risk.every((s) => s.count === 1)).toBe(true);
  });

  it("保有者が2名以上のスキルは含まれない(境界値)", async () => {
    const session = makeSession();
    const skillItems = await getSkillDashboard(session);
    const risk = extractRiskSkills(skillItems);

    expect(risk.some((s) => s.skillName === "Java")).toBe(false);
  });
});

describe("summarizeDashboard", () => {
  it("スキル種類数・資格保有件数・属人化リスク件数を正しく集計する", async () => {
    const session = makeSession();
    const skillItems = await getSkillDashboard(session);
    const certificationCategories = await getCertificationCategorySummary(session);

    const summary = summarizeDashboard(4, skillItems, certificationCategories);

    expect(summary.memberCount).toBe(4);
    expect(summary.skillTypeCount).toBe(3); // Java, AWS, Go
    expect(summary.certCount).toBe(3); // 基本情報2名 + AWS認定1名
    expect(summary.riskSkillCount).toBe(2); // AWS, Go
  });
});

describe("getCertificationCategorySummary", () => {
  it("カテゴリ別に保有件数を集計する", async () => {
    const session = makeSession();
    const result = await getCertificationCategorySummary(session);

    const national = result.find((c) => c.categoryName === "国家資格");
    const vendor = result.find((c) => c.categoryName === "ベンダー");
    expect(national?.total).toBe(2);
    expect(vendor?.total).toBe(1);
  });

  it("保有者0件のカテゴリもtotal=0・legend=[]で含まれる", async () => {
    const session = makeSession();
    const result = await getCertificationCategorySummary(session);

    const other = result.find((c) => c.categoryName === "その他");
    expect(other).toBeDefined();
    expect(other?.total).toBe(0);
    expect(other?.legend).toEqual([]);
  });

  it("組織フィルタで対象を絞り込める", async () => {
    const session = makeSession();
    // 開発部(10)配下(000001,000002)のみに絞ると、営業部(20)所属のAWS認定保有者(000003)は含まれない
    const result = await getCertificationCategorySummary(session, 10);

    const vendor = result.find((c) => c.categoryName === "ベンダー");
    expect(vendor?.total).toBe(0);
    const national = result.find((c) => c.categoryName === "国家資格");
    expect(national?.total).toBe(2);
  });
});

describe("getSkillCategoryHeatmap", () => {
  it("部署×スキルカテゴリで保有者数を集計する(配下Grは部署レベルに解決される)", async () => {
    const session = makeSession();
    const heatmap = await getSkillCategoryHeatmap(session);

    const devRow = heatmap.rows.find((r) => r.departmentName === "開発部");
    const salesRow = heatmap.rows.find((r) => r.departmentName === "営業部");
    expect(devRow).toBeDefined();
    expect(salesRow).toBeDefined();

    const progColumnIndex = heatmap.columns.findIndex((c) => c.categoryName === "プログラミング言語");
    const cloudColumnIndex = heatmap.columns.findIndex((c) => c.categoryName === "クラウド");

    // 開発部: 000001(第一Gr所属)・000002(開発部直属)が共にJava/Goの保有者 → プログラミング言語列は2名
    expect(devRow?.cells[progColumnIndex].count).toBe(2);
    expect(devRow?.cells[cloudColumnIndex].count).toBe(0);

    // 営業部: 000003のみ、AWS(クラウド)保有者 → クラウド列は1名
    expect(salesRow?.cells[cloudColumnIndex].count).toBe(1);
    expect(salesRow?.cells[progColumnIndex].count).toBe(0);
  });

  it("所属未設定(部署レベルに解決できない)社員は行の対象外", async () => {
    const session = makeSession();
    const heatmap = await getSkillCategoryHeatmap(session);

    // 000004は所属なしのため、どの部署行の母数にも含まれない
    const totalMembers = heatmap.rows.reduce((sum, row) => sum + row.memberCount, 0);
    expect(totalMembers).toBe(3);
  });

  it("保有者0件のセルはlevel=0になる", async () => {
    const session = makeSession();
    const heatmap = await getSkillCategoryHeatmap(session);

    const salesRow = heatmap.rows.find((r) => r.departmentName === "営業部");
    const progColumnIndex = heatmap.columns.findIndex((c) => c.categoryName === "プログラミング言語");
    expect(salesRow?.cells[progColumnIndex].level).toBe(0);
  });
});
