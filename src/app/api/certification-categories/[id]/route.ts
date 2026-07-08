import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { apiConflict, apiForbidden, apiNotFound, apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { certificationCategorySchema } from "@/lib/validation/master";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.certificationCategory.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.deletedAt) return apiNotFound();

  const parsed = certificationCategorySchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);

  try {
    const updated = await prisma.certificationCategory.update({
      where: { id: Number(id) },
      data: { ...parsed.data, updatedBy: session.user.employeeId },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return apiConflict("同じカテゴリコードが既に登録されています");
    }
    throw err;
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.certificationCategory.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.deletedAt) return apiNotFound();

  await prisma.certificationCategory.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date(), deletedBy: session.user.employeeId },
  });
  return NextResponse.json({ id: Number(id) });
}
