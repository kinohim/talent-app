import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-auth";
import { requireAdmin } from "@/lib/authz";
import { apiConflict, apiForbidden, apiNotFound, apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { departmentSchema } from "@/lib/validation/master";
import { ZodError } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

/** PATCH /api/departments/[id] — 組織更新（ADMINのみ、MST004）。 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.department.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.deletedAt) return apiNotFound();

  const parsed = departmentSchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);
  const body = parsed.data;

  // 階層整合性チェック（POSTと同じ規則）: 部署の親は事業部、Grの親は部署
  if (body.parentId) {
    const parent = await prisma.department.findFirst({
      where: { id: body.parentId, deletedAt: null },
    });
    const expectedParentLevel = body.orgLevel === "DEPARTMENT" ? "DIVISION" : "DEPARTMENT";
    if (!parent || parent.orgLevel !== expectedParentLevel || parent.id === Number(id)) {
      return apiValidationError(
        new ZodError([
          {
            code: "custom",
            message: "親組織の階層区分が不正です",
            path: ["parentId"],
          },
        ])
      );
    }
  }

  try {
    const updated = await prisma.department.update({
      where: { id: Number(id) },
      data: { ...body, updatedBy: session.user.employeeId },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return apiConflict("同じ組織コードが既に登録されています");
    }
    throw err;
  }
}

/** DELETE /api/departments/[id] — 論理削除（ADMINのみ）。関連社員は参照側で表示時に配慮する方針。 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.department.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.deletedAt) return apiNotFound();

  await prisma.department.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date(), deletedBy: session.user.employeeId },
  });

  return NextResponse.json({ id: Number(id) });
}
