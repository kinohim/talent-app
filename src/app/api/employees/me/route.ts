import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-auth";
import { apiNotFound, apiUnauthenticated } from "@/lib/api-response";
import { employeeDetailInclude, serializeEmployeeDetail } from "@/lib/employee-select";

/** GET /api/employees/me — 自分の経歴書取得（REF004/REF006）。 */
export async function GET() {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const employee = await prisma.employee.findUnique({
    where: { employeeId: session.user.employeeId },
    include: employeeDetailInclude,
  });

  if (!employee || employee.deletedAt) return apiNotFound();

  return NextResponse.json(serializeEmployeeDetail(employee));
}
