import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { apiConflict, apiForbidden, apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { projectRoleSchema } from "@/lib/validation/master";

/**
 * GET /api/project-roles — 現場ポジション（役割）マスタ一覧（MST003、参照はログイン済み全員可。EDT005用）。
 * includeDeleted=trueで削除済みも含める（ADR 0004）。
 */
export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const includeDeleted = req.nextUrl.searchParams.get("includeDeleted") === "true";
  const items = await prisma.projectRole.findMany({
    where: includeDeleted ? {} : { deletedAt: null },
    orderBy: { roleName: "asc" },
  });
  return NextResponse.json({ items });
}

/** POST /api/project-roles — 現場ポジション新規登録（ADMINのみ）。 */
export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const parsed = projectRoleSchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    const created = await prisma.projectRole.create({
      data: { ...parsed.data, createdBy: session.user.employeeId, updatedBy: session.user.employeeId },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return apiConflict("同じ役割名が既に登録されています");
    }
    throw err;
  }
}
