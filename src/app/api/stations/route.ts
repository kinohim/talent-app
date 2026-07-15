import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-auth";
import { apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { stationCreateSchema } from "@/lib/validation/station";

/**
 * GET /api/stations — 駅マスタ参照（EDT001の最寄り駅入力用）。
 * マスタ管理画面(MST)は持たない（ADR 0007）が、EDT001の駅検索（/api/stations/search）で
 * 選ばれた駅名をこのリソースへのPOSTで登録する運用に変更（find-or-create、CRUD画面は依然なし）。
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

/**
 * POST /api/stations — 駅名のfind-or-create。
 * EDT001で外部駅検索APIから選んだ駅名を自駅マスタに登録するための最小限のエンドポイント。
 */
export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const json = await req.json();
  const parsed = stationCreateSchema.safeParse(json);
  if (!parsed.success) return apiValidationError(parsed.error);

  const { stationName } = parsed.data;
  const actor = session.user.employeeId;

  const existing = await prisma.station.findFirst({
    where: { stationName, deletedAt: null },
    select: { id: true, stationName: true },
  });
  if (existing) return NextResponse.json(existing);

  const created = await prisma.station.create({
    data: { stationName, createdBy: actor, updatedBy: actor },
    select: { id: true, stationName: true },
  });
  return NextResponse.json(created, { status: 201 });
}
