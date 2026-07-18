import { afterEach, describe, expect, it, vi } from "vitest";
import { HeartRailsApiError, fetchLines, fetchStations } from "@/lib/heartrails";

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
