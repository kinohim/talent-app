import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { apiInternalError, apiUnauthenticated } from "@/lib/api-response";
import { HeartRailsApiError, fetchLines } from "@/lib/heartrails";
import { PREFECTURES } from "@/lib/prefectures";

/**
 * GET /api/railways?prefecture=<都道府県名> — 指定都道府県の路線一覧（EDT001/MST005の最寄り駅入力、2段階目）。
 * 路線マスタは持たず、HeartRails Express APIへ都度問い合わせる。
 */
export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const prefecture = req.nextUrl.searchParams.get("prefecture")?.trim() ?? "";
  if (!prefecture || !PREFECTURES.includes(prefecture)) {
    return NextResponse.json({ items: [] });
  }

  try {
    const items = await fetchLines(prefecture);
    return NextResponse.json({ items });
  } catch (err) {
    if (err instanceof HeartRailsApiError) return apiInternalError(err.message);
    throw err;
  }
}
