import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * src/lib/site-nearby-search.ts のユニットテスト（REF009 現場/参画者一覧）。
 * prisma・heartrailsをモックし、DBに接続せず (1)近隣判定 (2)同一路線判定 の
 * 組み合わせによる絞り込み・退職者/最寄駅未設定者の除外・距離昇順ソートを検証する。
 *
 * 座標はdesign/genbaモックアップと同じ実在の駅（勝どき・浅草橋・門前仲町）を流用。
 */

const siteFindUniqueMock = vi.fn();
const employeeFindManyMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    site: { findUnique: (...args: unknown[]) => siteFindUniqueMock(...args) },
    employee: { findMany: (...args: unknown[]) => employeeFindManyMock(...args) },
  },
}));

const fetchStationGeoMock = vi.fn();
vi.mock("@/lib/heartrails", () => ({
  fetchStationGeo: (...args: unknown[]) => fetchStationGeoMock(...args),
}));

const { searchSiteNearbyEmployees } = await import("@/lib/site-nearby-search");

const SITE = {
  id: 1,
  siteName: "○○証券 新契約システム",
  nearestStationLine: "都営大江戸線",
  nearestStationName: "勝どき",
};

type Geo = { lat: number; lng: number; line: string } | null;

const STATION_GEO: Record<string, Geo> = {
  勝どき: { lat: 35.6589, lng: 139.7773, line: "都営大江戸線" },
  浅草橋: { lat: 35.6972, lng: 139.7853, line: "JR総武線" }, // 現場から数km、別路線
  門前仲町: { lat: 35.6718, lng: 139.7967, line: "都営大江戸線" }, // 現場から近く、同一路線
  新宿: { lat: 35.6909, lng: 139.7003, line: "JR山手線" }, // 現場から遠く、別路線 → 対象外
  遠方駅: { lat: 43.0, lng: 141.0, line: "都営大江戸線" }, // 現場から遠いが同一路線
  不明駅: null, // 駅解決不可
};

const EMPLOYEES_RAW = [
  {
    employeeId: "000001",
    name: "近隣・同一路線太郎",
    nearestStationLine: "都営大江戸線",
    nearestStationName: "門前仲町",
    department: { departmentName: "DX推進部" },
    projects: [{ site: { siteName: "△△銀行 API開発" } }],
    skillLinks: [{ skill: { skillName: "Java" } }],
  },
  {
    employeeId: "000002",
    name: "近隣のみ花子",
    nearestStationLine: "JR総武線",
    nearestStationName: "浅草橋",
    department: { departmentName: "営業部" },
    projects: [],
    skillLinks: [],
  },
  {
    employeeId: "000003",
    name: "同一路線のみ次郎",
    nearestStationLine: "都営大江戸線",
    nearestStationName: "遠方駅",
    department: null,
    projects: [],
    skillLinks: [],
  },
  {
    employeeId: "000004",
    name: "対象外三郎",
    nearestStationLine: "JR山手線",
    nearestStationName: "新宿",
    department: null,
    projects: [],
    skillLinks: [],
  },
  {
    employeeId: "000005",
    name: "駅解決不可四郎",
    nearestStationLine: "謎路線",
    nearestStationName: "不明駅",
    department: null,
    projects: [],
    skillLinks: [],
  },
  {
    employeeId: "000006",
    name: "最寄駅未設定五郎",
    nearestStationLine: null,
    nearestStationName: null,
    department: null,
    projects: [],
    skillLinks: [],
  },
];

beforeEach(() => {
  siteFindUniqueMock.mockReset();
  employeeFindManyMock.mockReset();
  fetchStationGeoMock.mockReset();
  siteFindUniqueMock.mockResolvedValue(SITE);
  employeeFindManyMock.mockResolvedValue(EMPLOYEES_RAW);
  fetchStationGeoMock.mockImplementation(async (name: string) => STATION_GEO[name] ?? null);
});

describe("searchSiteNearbyEmployees", () => {
  it("近隣(半径内)・同一路線のいずれかに該当する社員のみ返し、いずれも満たさない社員は除外する", async () => {
    const result = await searchSiteNearbyEmployees(1, 5);
    const byId = new Map(result.employees.map((e) => [e.employeeId, e]));

    expect(byId.get("000001")).toMatchObject({ matchedNearby: true, matchedSameLine: true });
    expect(byId.get("000002")).toMatchObject({ matchedNearby: true, matchedSameLine: false });
    expect(byId.get("000003")).toMatchObject({ matchedNearby: false, matchedSameLine: true });
    expect(byId.has("000004")).toBe(false); // 近隣でも同一路線でもない
    expect(result.employees).toHaveLength(3);
  });

  it("駅座標が解決できない社員は除外し、unresolvedStationCountに数える", async () => {
    const result = await searchSiteNearbyEmployees(1, 5);
    expect(result.employees.some((e) => e.employeeId === "000005")).toBe(false);
    expect(result.unresolvedStationCount).toBe(1);
  });

  it("最寄駅未設定の社員は除外する", async () => {
    const result = await searchSiteNearbyEmployees(1, 5);
    expect(result.employees.some((e) => e.employeeId === "000006")).toBe(false);
  });

  it("結果を距離昇順でソートする", async () => {
    const result = await searchSiteNearbyEmployees(1, 5);
    const distances = result.employees.map((e) => e.distanceKm);
    expect(distances).toEqual([...distances].sort((a, b) => a - b));
  });

  it("現在参画中の現場名・所属・スキルを含める", async () => {
    const result = await searchSiteNearbyEmployees(1, 5);
    const taro = result.employees.find((e) => e.employeeId === "000001");
    expect(taro).toMatchObject({
      department: "DX推進部",
      currentSiteName: "△△銀行 API開発",
      skills: ["Java"],
    });
  });

  it("退職者・削除済み社員を除外する検索条件でDBに問い合わせる", async () => {
    await searchSiteNearbyEmployees(1, 5);
    expect(employeeFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          nearestStationName: { not: null },
          user: { is: { isActive: true } },
        }),
      })
    );
  });

  it("現場が見つからない場合はsite: nullを返す", async () => {
    siteFindUniqueMock.mockResolvedValueOnce(null);
    const result = await searchSiteNearbyEmployees(999, 5);
    expect(result).toEqual({ site: null, employees: [], unresolvedStationCount: 0 });
  });

  it("現場に最寄駅が未設定の場合はsite: nullを返す", async () => {
    siteFindUniqueMock.mockResolvedValueOnce({ ...SITE, nearestStationName: null });
    const result = await searchSiteNearbyEmployees(1, 5);
    expect(result.site).toBeNull();
  });

  it("現場駅の座標が解決できない場合はsite: nullを返す", async () => {
    fetchStationGeoMock.mockImplementation(async () => null);
    const result = await searchSiteNearbyEmployees(1, 5);
    expect(result.site).toBeNull();
  });
});
