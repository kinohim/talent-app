import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * src/app/api/railways/route.ts のユニットテスト。
 * 認証・パラメータ未指定/不正値・外部API障害時の挙動を、
 * getApiSession・fetchLinesをモックして検証する（HeartRailsへの実通信はしない）。
 */

const getApiSessionMock = vi.fn();
const fetchLinesMock = vi.fn();

vi.mock("@/lib/api-auth", () => ({
  getApiSession: (...args: unknown[]) => getApiSessionMock(...args),
}));

vi.mock("@/lib/heartrails", async () => {
  const actual = await vi.importActual<typeof import("@/lib/heartrails")>("@/lib/heartrails");
  return {
    ...actual,
    fetchLines: (...args: unknown[]) => fetchLinesMock(...args),
  };
});

import { GET } from "@/app/api/railways/route";
import { HeartRailsApiError } from "@/lib/heartrails";

beforeEach(() => {
  getApiSessionMock.mockReset();
  fetchLinesMock.mockReset();
});

function request(query: string) {
  return new NextRequest(`http://localhost/api/railways${query}`);
}

describe("GET /api/railways", () => {
  it("未認証は401を返す", async () => {
    getApiSessionMock.mockResolvedValue(null);
    const res = await GET(request("?prefecture=東京都"));
    expect(res.status).toBe(401);
  });

  it("正常系: 都道府県名を渡すとfetchLinesの結果をitemsで返す", async () => {
    getApiSessionMock.mockResolvedValue({ user: { employeeId: "000001" } });
    fetchLinesMock.mockResolvedValue(["JR山手線", "都営大江戸線"]);
    const res = await GET(request("?prefecture=東京都"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ items: ["JR山手線", "都営大江戸線"] });
    expect(fetchLinesMock).toHaveBeenCalledWith("東京都");
  });

  it("prefecture未指定は空配列を返す(バリデーションエラーにしない)", async () => {
    getApiSessionMock.mockResolvedValue({ user: { employeeId: "000001" } });
    const res = await GET(request(""));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
    expect(fetchLinesMock).not.toHaveBeenCalled();
  });

  it("PREFECTURESに含まれない値は空配列を返す(HeartRailsを叩かない)", async () => {
    getApiSessionMock.mockResolvedValue({ user: { employeeId: "000001" } });
    const res = await GET(request("?prefecture=存在しない県"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [] });
    expect(fetchLinesMock).not.toHaveBeenCalled();
  });

  it("外部API障害時は500を返す", async () => {
    getApiSessionMock.mockResolvedValue({ user: { employeeId: "000001" } });
    fetchLinesMock.mockRejectedValue(new HeartRailsApiError("HTTP 500"));
    const res = await GET(request("?prefecture=東京都"));
    expect(res.status).toBe(500);
  });
});
