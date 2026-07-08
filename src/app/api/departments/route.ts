import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-auth";
import { requireAdmin } from "@/lib/authz";
import { apiConflict, apiForbidden, apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { departmentSchema } from "@/lib/validation/master";
import { buildDepartmentTree, loadDepartments } from "@/lib/department-tree";
import { ZodError } from "zod";

/**
 * GET /api/departments — 組織一覧（参照はログイン済み全員可）。
 * api-design.md 2.4: 3階層ツリー（orgLevel・parentId）。GETはツリー構造で返す。
 * includeDeleted=trueで削除済みも含める（ADR 0004）。
 */
export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const includeDeleted = req.nextUrl.searchParams.get("includeDeleted") === "true";
  const records = await loadDepartments(includeDeleted);
  return NextResponse.json({ items: buildDepartmentTree(records) });
}

/** POST /api/departments — 組織新規登録（ADMINのみ、MST004）。 */
export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const parsed = departmentSchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);
  const body = parsed.data;

  // 階層整合性チェック: 部署の親は事業部、Grの親は部署（ADR 0007の3階層ツリー）
  if (body.parentId) {
    const parent = await prisma.department.findFirst({
      where: { id: body.parentId, deletedAt: null },
    });
    const expectedParentLevel = body.orgLevel === "DEPARTMENT" ? "DIVISION" : "DEPARTMENT";
    if (!parent || parent.orgLevel !== expectedParentLevel) {
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
    const created = await prisma.department.create({
      data: {
        code: body.code,
        departmentName: body.departmentName,
        orgLevel: body.orgLevel,
        parentId: body.parentId ?? null,
        createdBy: session.user.employeeId,
        updatedBy: session.user.employeeId,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return apiConflict("同じ組織コードが既に登録されています");
    }
    throw err;
  }
}
