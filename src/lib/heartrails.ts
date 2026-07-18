/**
 * HeartRails Express API（認証不要・登録不要の無料API）の薄いクライアント。
 * 最寄り駅欄（都道府県→路線→駅の3段階プルダウン、EDT001/MST005）から都度呼び出す。
 * scripts/fetch-stations.mjs（廃止済みの駅マスタ事前収集スクリプト）の呼び出しロジックを踏襲。
 */

const API_BASE = "https://express.heartrails.com/api/json";

export class HeartRailsApiError extends Error {}

type HeartRailsResponse = {
  line?: string | string[];
  station?: { name: string }[] | { name: string };
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
