import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { getApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { apiForbidden, apiNotFound, apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { accountUpdateSchema } from "@/lib/validation/account";

type RouteParams = { params: Promise<{ employeeId: string }> };

/** GET /api/accounts/[employeeId] — アカウント1件取得（EDT007の初期表示用、ADMINのみ）。 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { employeeId } = await params;
  const user = await prisma.user.findUnique({
    where: { employeeId },
    include: { employee: { include: { department: true } } },
  });
  if (!user) return apiNotFound();

  return NextResponse.json({
    employeeId: user.employeeId,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    name: user.employee.name,
    nameKana: user.employee.nameKana,
    departmentId: user.employee.departmentId,
    departmentName: user.employee.department?.departmentName ?? null,
  });
}

/**
 * PATCH /api/accounts/[employeeId] — アカウント編集（EDT007、ADMINのみ）。
 * 所属部署（Employee.departmentId）・権限（User.role）を変更し、退職・無効化処理は
 * User.isActiveの更新で行う（ADR 0009、毎リクエストDBチェックで即時反映）。
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { employeeId } = await params;
  const existing = await prisma.user.findUnique({ where: { employeeId } });
  if (!existing) return apiNotFound();

  const parsed = accountUpdateSchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);
  const body = parsed.data;
  const actor = session.user.employeeId;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (body.departmentId !== undefined) {
        await tx.employee.update({
          where: { employeeId },
          data: { departmentId: body.departmentId, updatedBy: actor },
        });
      }
      return tx.user.update({
        where: { employeeId },
        data: {
          ...(body.role !== undefined ? { role: body.role } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
          updatedBy: actor,
        },
      });
    });
    return NextResponse.json({ employeeId: updated.employeeId, updatedAt: updated.updatedAt });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2025" || err.code === "P2003")
    ) {
      return apiValidationError(
        new ZodError([
          { code: "custom", message: "指定された所属部署が存在しません", path: ["departmentId"] },
        ])
      );
    }
    throw err;
  }
}
