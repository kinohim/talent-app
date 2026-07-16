import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { apiConflict, apiForbidden, apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { certificationCategorySchema } from "@/lib/validation/master";
import { generateCertificationCategoryCode } from "@/lib/category-code";

/** GET /api/certification-categories — 資格カテゴリ一覧（参照はログイン済み全員可、MST002）。 */
export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const includeDeleted = req.nextUrl.searchParams.get("includeDeleted") === "true";
  const items = await prisma.certificationCategory.findMany({
    where: includeDeleted ? {} : { deletedAt: null },
    orderBy: { code: "asc" },
  });
  return NextResponse.json({ items });
}

/** POST /api/certification-categories — 資格カテゴリ新規登録（ADMINのみ）。 */
export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const parsed = certificationCategorySchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    const code = await generateCertificationCategoryCode();
    const created = await prisma.certificationCategory.create({
      data: { ...parsed.data, code, createdBy: session.user.employeeId, updatedBy: session.user.employeeId },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return apiConflict("同じカテゴリコードが既に登録されています");
    }
    throw err;
  }
}
