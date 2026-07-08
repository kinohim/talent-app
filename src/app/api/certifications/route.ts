import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { apiForbidden, apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { certificationSchema } from "@/lib/validation/master";

/** GET /api/certifications — 資格一覧（参照はログイン済み全員可、MST002/EDT004）。 */
export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const includeDeleted = req.nextUrl.searchParams.get("includeDeleted") === "true";
  const certifications = await prisma.certification.findMany({
    where: includeDeleted ? {} : { deletedAt: null },
    include: { category: true },
    orderBy: { certificationName: "asc" },
  });
  return NextResponse.json({
    items: certifications.map((c) => ({
      id: c.id,
      categoryId: c.categoryId,
      categoryName: c.category.categoryName,
      certificationName: c.certificationName,
      certificationOrganization: c.certificationOrganization,
      deletedAt: c.deletedAt,
    })),
  });
}

/** POST /api/certifications — 資格新規登録（ADMINのみ）。 */
export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const parsed = certificationSchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);

  const created = await prisma.certification.create({
    data: { ...parsed.data, createdBy: session.user.employeeId, updatedBy: session.user.employeeId },
  });
  return NextResponse.json(created, { status: 201 });
}
