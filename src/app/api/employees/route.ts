import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { apiUnauthenticated, parsePagination } from "@/lib/api-response";
import { searchEmployees, type EmployeeSearchParams, type EmployeeSortBy } from "@/lib/employee-search";

/**
 * GET /api/employees — 経歴書一覧・横断検索（REF002）。
 * docs/design/api-design.md 2.2:
 * - 全ロールとも全社員が検索対象（認可で絞り込まない、ADR 0008）
 * - 各行にcanViewDetailを付与（GENERALは他部署の行の詳細リンクを非活性化）
 * - 一覧行に経歴書の全項目（生年月日・学歴・自己PR等）は含めない
 * - 論理削除済みは常に非表示（一覧からの削除済み表示切替は廃止）
 */

const SORT_BY_VALUES: EmployeeSortBy[] = ["employeeId", "name", "department", "hireDate"];

function parseIdList(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v > 0);
}

function parseOptionalInt(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalDate(value: string | null): string | undefined {
  if (value === null || value.trim() === "") return undefined;
  return Number.isNaN(Date.parse(value)) ? undefined : value;
}

export async function GET(req: NextRequest) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const searchParams = req.nextUrl.searchParams;
  const { page, pageSize } = parsePagination(searchParams);

  const params: EmployeeSearchParams = {
    name: searchParams.get("name")?.trim() || undefined,
    departmentId: parseOptionalInt(searchParams.get("departmentId")),
    hireDateFrom: parseOptionalDate(searchParams.get("hireDateFrom")),
    hireDateTo: parseOptionalDate(searchParams.get("hireDateTo")),
    skillIds: parseIdList(searchParams.get("skillIds")),
    skillMatch: searchParams.get("skillMatch") === "and" ? "and" : "or",
    certificationIds: parseIdList(searchParams.get("certificationIds")),
    certificationMatch: searchParams.get("certificationMatch") === "and" ? "and" : "or",
    siteIds: parseIdList(searchParams.get("siteIds")),
    siteScope: searchParams.get("siteScope") === "all" ? "all" : "current",
    sortBy: (SORT_BY_VALUES as string[]).includes(searchParams.get("sortBy") ?? "")
      ? (searchParams.get("sortBy") as EmployeeSortBy)
      : "employeeId",
    sortOrder: searchParams.get("sortOrder") === "desc" ? "desc" : "asc",
    page,
    pageSize,
  };

  const result = await searchEmployees(session, params);
  return NextResponse.json(result);
}
