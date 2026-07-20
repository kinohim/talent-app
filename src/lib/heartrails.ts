/**
 * HeartRails Express API（認証不要・登録不要の無料API）の薄いクライアント。
 * 最寄り駅欄（都道府県→路線→駅の3段階プルダウン、EDT001/MST005）から都度呼び出す。
 * scripts/fetch-stations.mjs（廃止済みの駅マスタ事前収集スクリプト）の呼び出しロジックを踏襲。
 */

const API_BASE = "https://express.heartrails.com/api/json";

export class HeartRailsApiError extends Error {}

type HeartRailsStation = { name: string; x?: string; y?: string; line?: string };

type HeartRailsResponse = {
  line?: string | string[];
  station?: HeartRailsStation[] | HeartRailsStation;
  error?: string;
};

async function callApi(params: Record<string, string>): Promise<HeartRailsResponse | null> {
  const url = `${API_BASE}?${new URLSearchParams(params).toString()}`;
  let res: Response;
  try {
    res = await fetch(url, { next: { revalidate: 3600 } });
  } catch (err) {
    throw new HeartRailsApiError(`HeartRails Expressへの接続に失敗しました: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new HeartRailsApiError(`HeartRails Express APIがエラーを返しました: HTTP ${res.status}`);
  }
  const data = (await res.json()) as { response?: HeartRailsResponse };
  if (data?.response?.error) return null;
  return data.response ?? null;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (Array.isArray(value)) return value;
  return value !== undefined ? [value] : [];
}

export async function fetchLines(prefecture: string): Promise<string[]> {
  const response = await callApi({ method: "getLines", prefecture });
  const lines = toArray(response?.line);
  return Array.from(new Set(lines)).sort((a, b) => a.localeCompare(b, "ja"));
}

export async function fetchStations(line: string): Promise<string[]> {
  const response = await callApi({ method: "getStations", line });
  const stations = toArray(response?.station).map((s) => s.name);
  return Array.from(new Set(stations)).sort((a, b) => a.localeCompare(b, "ja"));
}

export type StationGeo = { lat: number; lng: number; line: string };

/**
 * 駅名から緯度経度を取得する（現場/参画者一覧の地図ピン用）。
 * 同名駅が複数路線に存在する場合、lineHintと一致する候補を優先し、
 * 一致するものがなければ先頭候補にフォールバックする。
 */
export async function fetchStationGeo(
  stationName: string,
  lineHint?: string
): Promise<StationGeo | null> {
  const response = await callApi({ method: "getStations", name: stationName });
  const candidates = toArray(response?.station).filter(
    (s) => s.x !== undefined && s.y !== undefined
  );
  if (candidates.length === 0) return null;

  const matched = lineHint ? candidates.find((s) => s.line === lineHint) : undefined;
  const chosen = matched ?? candidates[0];

  const lat = Number(chosen.y);
  const lng = Number(chosen.x);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng, line: chosen.line ?? lineHint ?? "" };
}
