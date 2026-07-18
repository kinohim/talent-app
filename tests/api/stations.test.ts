import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * src/app/api/stations/route.ts のユニットテスト。
 * 駅マスタ廃止後は、指定路線の駅一覧を外部API(HeartRails Express)から都度取得するのみ。
 * getApiSession・fetchStationsをモックして検証する。
 */

const getApiSessionMock = vi.fn();
const fetchStationsMock = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  getApiSession: (...args: unknown[]) => getApiSessionMock(...args),
}));

vi.mock("@/lib/heartrails", async () => {
  const actual = await vi.importActual<typeof import("@/lib/heartrails")>("@/lib/heartrails");
  return {
    ...actual,
    fetchStations: (...args: unknown[]) => fetchStationsMock(...args),
  };
});

import { GET } from "@/app/api/stations/route";
import { HeartRailsApiError } from "@/lib/heartrails";

beforeEach(() => {
  getApiSessionMock.mockReset();
  fetchStationsMock.mockReset();
});

function request(query: string) {
  return new NextRequest(`http://localhost/api/stations${query}`);
}

describe("GET /api/stations", () => {
  it("未認証は401を返す", async () => {
    getApiSessionMock.mockResolvedValue(null);
    const res = await GET(request("?line=JR山手線"));
    expect(res.status).toBe(401);
  });

  it("正常系: 路線名を渡すとfetchStationsの結果をitemsで返す", async () => {
    getApiSessionMock.mockResolvedValue({ user: { employeeId: "000001" } });
    fetchStationsMock.mockResolvedValue(["東京", "渋谷"]);
    const res = await GET(request("?line=JR山手線"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: ["東京", "渋谷"] });
    expect(fetchStationsMock).toHaveBeenCalledWith("JR山手線");
  });

  it("line未指定は空配列を返す(バリデーションエラーにしない)", async () => {
    getApiSessionMock.mockResolvedValue({ user: { employeeId: "000001" } });
    const res = await GET(request(""));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
    expect(fetchStationsMock).not.toHaveBeenCalled();
  });

  it("外部API障害時は500を返す", async () => {
    getApiSessionMock.mockResolvedValue({ user: { employeeId: "000001" } });
    fetchStationsMock.mockRejectedValue(new HeartRailsApiError("HTTP 500"));
    const res = await GET(request("?line=JR山手線"));
    expect(res.status).toBe(500);
  });
});
