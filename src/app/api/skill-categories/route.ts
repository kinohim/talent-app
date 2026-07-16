import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { apiConflict, apiForbidden, apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { skillCategorySchema } from "@/lib/validation/master";
import { generateSkillCategoryCode } from "@/lib/category-code";

/** GET /api/skill-categories — スキルカテゴリ一覧（参照はログイン済み全員可、MST001）。 */
export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const includeDeleted = req.nextUrl.searchParams.get("includeDeleted") === "true";
  const items = await prisma.skillCategory.findMany({
    where: includeDeleted ? {} : { deletedAt: null },
    orderBy: { code: "asc" },
  });
  return NextResponse.json({ items });
}

/** POST /api/skill-categories — スキルカテゴリ新規登録（ADMINのみ）。 */
export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const parsed = skillCategorySchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    const code = await generateSkillCategoryCode();
    const created = await prisma.skillCategory.create({
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
