import { NextRequest, NextResponse } from "next/server";
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

  // 組織コードはユーザー入力させず自動採番のため更新対象に含めない（bodyにcodeは存在しない）
  const updated = await prisma.department.update({
    where: { id: Number(id) },
    data: { ...body, updatedBy: session.user.employeeId },
  });
  return NextResponse.json(updated);
}

/**
 * DELETE /api/departments/[id] — 論理削除（ADMINのみ）。
 * 配下に組織がある場合、または所属社員（現職・退職を問わず削除されていない社員）が
 * いる場合は削除不可（screens.md MST004、schema.mdの一般ルール）。
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { id } = await params;
  const departmentId = Number(id);
  const existing = await prisma.department.findUnique({ where: { id: departmentId } });
  if (!existing || existing.deletedAt) return apiNotFound();

  const [childCount, employeeCount] = await Promise.all([
    prisma.department.count({ where: { parentId: departmentId, deletedAt: null } }),
    prisma.employee.count({ where: { departmentId, deletedAt: null } }),
  ]);
  if (childCount > 0) {
    return apiConflict("配下に組織があるため削除できません");
  }
  if (employeeCount > 0) {
    return apiConflict("社員が所属しているため削除できません");
  }

  await prisma.department.update({
    where: { id: departmentId },
    data: { deletedAt: new Date(), deletedBy: session.user.employeeId },
  });

  return NextResponse.json({ id: departmentId });
}
