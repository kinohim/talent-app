import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { ZodError } from "zod";
import { getApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { apiConflict, apiForbidden, apiUnauthenticated, apiValidationError, parsePagination } from "@/lib/api-response";
import { accountCreateSchema } from "@/lib/validation/account";
import { searchAccounts, type AccountStatus } from "@/lib/account-search";

const ROLE_VALUES = new Set<string>(["GENERAL", "MANAGER", "HR_SALES", "ADMIN"]);
const STATUS_VALUES = new Set<string>(["ACTIVE", "INACTIVE"]);

function toIdList(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v > 0);
}

/**
 * GET /api/accounts — アカウント一覧（REF007、ADMINのみ）。
 * 氏名（あいまい検索）、所属組織／権限／状態（複数選択）で絞込み（screens.md #8）。
 */
export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const sp = req.nextUrl.searchParams;
  const { page, pageSize } = parsePagination(sp);
  const roles = (sp.get("roles")?.split(",") ?? []).filter((r) => ROLE_VALUES.has(r)) as Role[];
  const statuses = (sp.get("statuses")?.split(",") ?? []).filter((s) => STATUS_VALUES.has(s)) as AccountStatus[];

  const result = await searchAccounts({
    name: sp.get("name")?.trim() || undefined,
    departmentIds: toIdList(sp.get("departmentIds")),
    roles,
    statuses,
    page,
    pageSize,
  });

  return NextResponse.json(result);
}

/**
 * POST /api/accounts — 新規アカウント登録（EDT006、ADMINのみ）。
 * ADR 0009: User（employeeId, email, role）＋Employee（name, nameKana, departmentId）を
 * 同一トランザクションで作成する。社員ID・メールアドレスの重複はサーバー側で事前チェックする。
 */
export async function POST(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const parsed = accountCreateSchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);
  const body = parsed.data;
  const actor = session.user.employeeId;

  const [existingEmployee, existingUser] = await Promise.all([
    prisma.employee.findUnique({ where: { employeeId: body.employeeId } }),
    prisma.user.findUnique({ where: { email: body.email } }),
  ]);
  if (existingEmployee) {
    return apiConflict("この社員IDは既に登録されています");
  }
  if (existingUser) {
    return apiConflict("このメールアドレスは既に登録されています");
  }

  try {
    const created = await prisma.$transaction(async (tx) => {
      await tx.employee.create({
        data: {
          employeeId: body.employeeId,
          name: body.name,
          nameKana: body.nameKana,
          departmentId: body.departmentId ?? null,
          createdBy: actor,
          updatedBy: actor,
        },
      });
      return tx.user.create({
        data: {
          employeeId: body.employeeId,
          email: body.email,
          role: body.role,
          isActive: true,
          createdBy: actor,
          updatedBy: actor,
        },
      });
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return apiConflict("この社員IDまたはメールアドレスは既に登録されています");
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2003") {
      return apiValidationError(
        new ZodError([
          { code: "custom", message: "指定された所属部署が存在しません", path: ["departmentId"] },
        ])
      );
    }
    throw err;
  }
}
