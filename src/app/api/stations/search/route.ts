import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { apiUnauthenticated } from "@/lib/api-response";

type HeartRailsStation = { name: string };

/**
 * GET /api/stations/search?q=... — 外部の無料駅検索API（HeartRails Express、認証不要）を
 * サーバー経由でプロキシする。EDT001の最寄り駅入力で、リアルタイム検索の候補として使う。
 * クライアントから直接叩かない（CORS回避・外部依存先の秘匿）。
 */
export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ items: [] });

  try {
    const url = `https://express.heartrails.com/api/json?method=getStations&name=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ items: [] });

    const data = await res.json();
    const raw = data?.response?.station;
    const list: HeartRailsStation[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

    const names = Array.from(new Set(list.map((s) => s.name).filter(Boolean))).slice(0, 20);
    return NextResponse.json({ items: names });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
