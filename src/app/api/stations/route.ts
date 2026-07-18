import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { apiInternalError, apiUnauthenticated } from "@/lib/api-response";
import { HeartRailsApiError, fetchStations } from "@/lib/heartrails";

/**
 * GET /api/stations?line=<路線名> — 指定路線の駅一覧（EDT001/MST005の最寄り駅入力、3段階目）。
 * 駅マスタは持たず、HeartRails Express APIへ都度問い合わせる。
 */
export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const line = req.nextUrl.searchParams.get("line")?.trim() ?? "";
  if (!line) return NextResponse.json({ items: [] });

  try {
    const items = await fetchStations(line);
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof HeartRailsApiError) return apiInternalError(err.message);
    throw err;
  }
}
