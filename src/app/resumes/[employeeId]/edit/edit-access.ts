import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditEmployee } from "@/lib/authz";
import { employeeDetailInclude, type EmployeeDetail } from "@/lib/employee-select";

/**
 * EDT001〜004共通の編集アクセスチェック（Server Component用の一次チェック）。
 * 最終判定はPATCH API側（canEditEmployee）でも必ず行う（detailed-design.md 2.1の二重チェック）。
 */
export async function getEditContext(employeeId: string): Promise<{
  session: Session;
  employee: EmployeeDetail;
  allowed: boolean;
}> {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const employee = await prisma.employee.findUnique({
    where: { employeeId },
    include: employeeDetailInclude,
  });
  if (!employee || employee.deletedAt) notFound();

  const allowed = await canEditEmployee(session, employee);
  return { session, employee, allowed };
}
