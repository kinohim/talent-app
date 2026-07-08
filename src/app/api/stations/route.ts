import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-auth";
import { apiUnauthenticated } from "@/lib/api-response";

/**
 * GET /api/stations — 駅マスタ参照（EDT001の最寄り駅プルダウン用）。
 * GETのみ提供し、マスタ管理画面は持たない（ADR 0007。データは初期投入スクリプトで整備）。
 */
export async function GET() {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const stations = await prisma.station.findMany({
    where: { deletedAt: null },
    orderBy: { stationName: "asc" },
    select: { id: true, stationName: true },
  });

  return NextResponse.json({ items: stations });
}
