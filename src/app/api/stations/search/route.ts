import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-auth";
import { apiUnauthenticated } from "@/lib/api-response";

/**
 * GET /api/stations/search?q=... — 駅マスタ（station テーブル）への駅名部分一致検索。
 * EDT001の最寄り駅入力で、リアルタイム検索の候補として使う。
 * 以前は外部の無料駅検索API（HeartRails Express）へ都度問い合わせていたが、
 * 同APIは駅名の完全一致検索のみでインクリメンタル検索に使えないため、
 * 事前に収集・投入済みの自駅マスタへの検索に変更した
 * （データ収集: scripts/fetch-stations.mjs、投入: prisma/seed.ts）。
 */
export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ items: [] });

  const stations = await prisma.station.findMany({
    where: { stationName: { contains: q, mode: "insensitive" }, deletedAt: null },
    select: { stationName: true },
    orderBy: { stationName: "asc" },
    take: 20,
  });

  return NextResponse.json({ items: stations.map((s) => s.stationName) });
}
