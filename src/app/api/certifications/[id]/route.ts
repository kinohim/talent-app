import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { apiForbidden, apiNotFound, apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { certificationSchema } from "@/lib/validation/master";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.certification.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.deletedAt) return apiNotFound();

  const parsed = certificationSchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);

  const updated = await prisma.certification.update({
    where: { id: Number(id) },
    data: { ...parsed.data, updatedBy: session.user.employeeId },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.certification.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.deletedAt) return apiNotFound();

  await prisma.certification.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date(), deletedBy: session.user.employeeId },
  });
  return NextResponse.json({ id: Number(id) });
}
