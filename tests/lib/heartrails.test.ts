import { afterEach, describe, expect, it, vi } from "vitest";
import { HeartRailsApiError, fetchLines, fetchStations, fetchStationGeo } from "@/lib/heartrails";

/**
 * src/lib/heartrails.ts のユニットテスト。
 * HeartRails Express APIはgetLines/getStationsで単一要素の場合に配列でなくオブジェクト単体を
 * 返すことがあるため、その正規化・重複除去・ソート順・エラー時の挙動を検証する。
 */

function mockFetchOnce(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: init.ok ?? true,
      status: init.status ?? 200,
      json: async () => body,
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchLines", () => {
  it("配列レスポンスを重複除去・五十音順ソートして返す", async () => {
    mockFetchOnce({ response: { line: ["JR山手線", "都営大江戸線", "JR山手線"] } });
    const lines = await fetchLines("東京都");
    expect(lines).toEqual(["JR山手線", "都営大江戸線"]);
  });

  it("単一要素は配列でなくオブジェクトで返ることがあるので配列に正規化する", async () => {
    mockFetchOnce({ response: { line: "JR山手線" } });
    const lines = await fetchLines("東京都");
    expect(lines).toEqual(["JR山手線"]);
  });

  it("HTTPエラー時はHeartRailsApiErrorをthrowする", async () => {
    mockFetchOnce({}, { ok: false, status: 500 });
    await expect(fetchLines("東京都")).rejects.toThrow(HeartRailsApiError);
  });

  it("response.errorが返る場合は空配列とする(ハードエラーにしない)", async () => {
    mockFetchOnce({ response: { error: "unknown prefecture" } });
    const lines = await fetchLines("存在しない県");
    expect(lines).toEqual([]);
  });
});

describe("fetchStations", () => {
  it("station.nameを抽出し重複除去・ソートして返す", async () => {
    mockFetchOnce({
      response: { station: [{ name: "渋谷" }, { name: "東京" }, { name: "渋谷" }] },
    });
    const stations = await fetchStations("JR山手線");
    expect(stations).toEqual(["渋谷", "東京"]);
  });

  it("単一要素はオブジェクトで返ることがあるので配列に正規化する", async () => {
    mockFetchOnce({ response: { station: { name: "東京" } } });
    const stations = await fetchStations("JR山手線");
    expect(stations).toEqual(["東京"]);
  });

  it("ネットワークエラー時はHeartRailsApiErrorをthrowする", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down"))
    );
    await expect(fetchStations("JR山手線")).rejects.toThrow(HeartRailsApiError);
  });
});

describe("fetchStationGeo", () => {
  it("単一候補の緯度経度(y/x)を返す", async () => {
    mockFetchOnce({
      response: { station: { name: "渋谷", x: "139.701", y: "35.658", line: "JR山手線" } },
    });
    const geo = await fetchStationGeo("渋谷");
    expect(geo).toEqual({ lat: 35.658, lng: 139.701, line: "JR山手線" });
  });

  it("同名駅が複数路線にある場合、lineHintと一致する候補を優先する", async () => {
    mockFetchOnce({
      response: {
        station: [
          { name: "渋谷", x: "139.701", y: "35.658", line: "東急東横線" },
          { name: "渋谷", x: "139.702", y: "35.659", line: "JR山手線" },
        ],
      },
    });
    const geo = await fetchStationGeo("渋谷", "JR山手線");
    expect(geo).toEqual({ lat: 35.659, lng: 139.702, line: "JR山手線" });
  });

  it("lineHintと一致する候補がなければ先頭候補にフォールバックする", async () => {
    mockFetchOnce({
      response: {
        station: [{ name: "渋谷", x: "139.701", y: "35.658", line: "東急東横線" }],
      },
    });
    const geo = await fetchStationGeo("渋谷", "存在しない路線");
    expect(geo).toEqual({ lat: 35.658, lng: 139.701, line: "東急東横線" });
  });

  it("座標を持つ候補がない場合はnullを返す", async () => {
    mockFetchOnce({ response: { station: { name: "渋谷" } } });
    const geo = await fetchStationGeo("渋谷");
    expect(geo).toBeNull();
  });

  it("response.errorが返る場合はnullを返す", async () => {
    mockFetchOnce({ response: { error: "unknown station" } });
    const geo = await fetchStationGeo("存在しない駅");
    expect(geo).toBeNull();
  });

  it("HTTPエラー時はHeartRailsApiErrorをthrowする", async () => {
    mockFetchOnce({}, { ok: false, status: 500 });
    await expect(fetchStationGeo("渋谷")).rejects.toThrow(HeartRailsApiError);
  });
});
