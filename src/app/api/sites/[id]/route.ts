import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { apiConflict, apiForbidden, apiNotFound, apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { siteSchema } from "@/lib/validation/master";

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/sites/[id] — 現場更新（ADMINのみ、MST005）。 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.site.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.deletedAt) return apiNotFound();

  const parsed = siteSchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    const updated = await prisma.site.update({
      where: { id: Number(id) },
      data: { ...parsed.data, updatedBy: session.user.employeeId },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return apiConflict("同じ現場名が既に登録されています");
    }
    throw err;
  }
}

/** DELETE /api/sites/[id] — 論理削除（ADMINのみ）。参照中のProjectは残す方針（detailed-design.md 3章）。 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.site.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.deletedAt) return apiNotFound();

  await prisma.site.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date(), deletedBy: session.user.employeeId },
  });
  return NextResponse.json({ id: Number(id) });
}
