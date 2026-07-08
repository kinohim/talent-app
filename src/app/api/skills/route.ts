import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { apiForbidden, apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { skillSchema } from "@/lib/validation/master";

/**
 * GET /api/skills — スキル一覧（参照はログイン済み全員可、MST001/EDT003）。
 * api-design.md: skillVersionsをネストで返す。includeDeleted=trueで削除済みも含める（ADR 0004）。
 */
export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const includeDeleted = req.nextUrl.searchParams.get("includeDeleted") === "true";
  const skills = await prisma.skill.findMany({
    where: includeDeleted ? {} : { deletedAt: null },
    include: {
      category: true,
      versions: { where: { deletedAt: null }, orderBy: { versionOrder: "asc" } },
    },
    orderBy: { skillName: "asc" },
  });

  return NextResponse.json({
    items: skills.map((s) => ({
      id: s.id,
      categoryId: s.categoryId,
      categoryName: s.category.categoryName,
      skillName: s.skillName,
      hasVersion: s.hasVersion,
      versions: s.versions.map((v) => v.versionName),
      versionDetails: s.versions.map((v) => ({ id: v.id, versionName: v.versionName })),
      deletedAt: s.deletedAt,
    })),
  });
}

/** POST /api/skills — スキル新規登録（ADMINのみ）。バージョンは複数タグ入力（screens.md MST001）。 */
export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const parsed = skillSchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);
  const { versions, ...data } = parsed.data;
  const versionNames = [...new Set(versions ?? [])];
  const actor = session.user.employeeId;

  const created = await prisma.skill.create({
    data: {
      ...data,
      hasVersion: versionNames.length > 0,
      createdBy: actor,
      updatedBy: actor,
      versions: {
        create: versionNames.map((versionName, index) => ({
          versionName,
          versionOrder: index + 1,
          createdBy: actor,
          updatedBy: actor,
        })),
      },
    },
    include: { versions: true },
  });
  return NextResponse.json(created, { status: 201 });
}
