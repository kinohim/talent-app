import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { apiError, apiUnauthenticated } from "@/lib/api-response";
import { getCertificationDashboard } from "@/lib/dashboard";

/**
 * GET /api/dashboard/certifications?departmentId= — スキルマップ／組織ダッシュボード（REF008）。
 * docs/design/api-design.md 2.3。departmentId省略時は全社集計。
 */
export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const departmentIdRaw = req.nextUrl.searchParams.get("departmentId");
  let departmentId: number | undefined;
  if (departmentIdRaw !== null && departmentIdRaw.trim() !== "") {
    const parsed = Number(departmentIdRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return apiError("VALIDATION_ERROR", "departmentIdが不正です");
    }
    departmentId = parsed;
  }

  const items = await getCertificationDashboard(session, departmentId);
  return NextResponse.json({ departmentId: departmentId ?? null, items });
}
