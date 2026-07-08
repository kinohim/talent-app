import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { apiConflict, apiForbidden, apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { siteSchema } from "@/lib/validation/master";

/**
 * GET /api/sites — 現場マスタ一覧（MST005、参照はログイン済み全員可。EDT005のプルダウン用）。
 * includeDeleted=trueで削除済みも含める（ADR 0004）。
 */
export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const includeDeleted = req.nextUrl.searchParams.get("includeDeleted") === "true";
  const items = await prisma.site.findMany({
    where: includeDeleted ? {} : { deletedAt: null },
    orderBy: { siteName: "asc" },
  });
  return NextResponse.json({ items });
}

/** POST /api/sites — 現場新規登録（ADMINのみ）。 */
export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const parsed = siteSchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    const created = await prisma.site.create({
      data: { ...parsed.data, createdBy: session.user.employeeId, updatedBy: session.user.employeeId },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return apiConflict("同じ現場名が既に登録されています");
    }
    throw err;
  }
}
