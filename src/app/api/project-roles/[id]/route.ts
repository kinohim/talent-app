import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { apiConflict, apiForbidden, apiNotFound, apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { projectRoleSchema } from "@/lib/validation/master";

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/project-roles/[id] — 現場ポジション更新（ADMINのみ、MST003）。 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.projectRole.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.deletedAt) return apiNotFound();

  const parsed = projectRoleSchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    const updated = await prisma.projectRole.update({
      where: { id: Number(id) },
      data: { ...parsed.data, updatedBy: session.user.employeeId },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return apiConflict("同じ役割名が既に登録されています");
    }
    throw err;
  }
}

/** DELETE /api/project-roles/[id] — 論理削除（ADMINのみ）。参照中のProjectRoleLinkは残す方針。 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.projectRole.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.deletedAt) return apiNotFound();

  await prisma.projectRole.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date(), deletedBy: session.user.employeeId },
  });
  return NextResponse.json({ id: Number(id) });
}
