import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { flattenDepartmentOptions } from "@/lib/department-tree";
import { MultiSelectDropdown } from "@/components/MultiSelectDropdown";
import {
  loadSearchMasters,
  searchEmployees,
  type EmployeeSearchParams,
} from "@/lib/employee-search";

/**
 * REF002 経歴書一覧（/resumes）。
 * 全社員の経歴書を検索・一覧表示。検索条件は detailed-design.md 3章のREF002仕様に準拠:
 * 氏名・カナ／所属組織（配下含む）／経験年数／スキル（AND/OR）／資格（AND/OR）／現場。
 * 検索ロジックはGET /api/employeesと共通（src/lib/employee-search.ts）。
 * GENERALの場合、他部署の社員は一覧行のみ表示し詳細リンクは非活性（ADR 0008）。
 */

const PAGE_SIZE = 20;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function toIdList(value: string | string[] | undefined): number[] {
  return toArray(value)
    .flatMap((v) => v.split(","))
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v > 0);
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function toOptionalInt(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function ResumesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const sp = await searchParams;
  const params: EmployeeSearchParams = {
    name: first(sp.name)?.trim() || undefined,
    departmentId: toOptionalInt(first(sp.departmentId)),
    experienceYearsMin: toOptionalInt(first(sp.experienceYearsMin)),
    experienceYearsMax: toOptionalInt(first(sp.experienceYearsMax)),
    skillIds: toIdList(sp.skillIds),
    skillMatch: first(sp.skillMatch) === "and" ? "and" : "or",
    certificationIds: toIdList(sp.certificationIds),
    certificationMatch: first(sp.certificationMatch) === "and" ? "and" : "or",
    siteIds: toIdList(sp.siteIds),
    includeDeleted: first(sp.includeDeleted) === "true",
    page: Math.max(1, toOptionalInt(first(sp.page)) ?? 1),
    pageSize: PAGE_SIZE,
  };

  const [masters, result] = await Promise.all([
    loadSearchMasters(),
    searchEmployees(session, params),
  ]);
  const departmentOptions = flattenDepartmentOptions(masters.departmentTree);
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  // ページネーションリンク用: 現在の検索条件を維持してpageのみ差し替える
  const buildPageQuery = (page: number) => {
    const query = new URLSearchParams();
    if (params.name) query.set("name", params.name);
    if (params.departmentId !== undefined) query.set("departmentId", String(params.departmentId));
    if (params.experienceYearsMin !== undefined)
      query.set("experienceYearsMin", String(params.experienceYearsMin));
    if (params.experienceYearsMax !== undefined)
      query.set("experienceYearsMax", String(params.experienceYearsMax));
    for (const id of params.skillIds) query.append("skillIds", String(id));
    if (params.skillIds.length > 0) query.set("skillMatch", params.skillMatch);
    for (const id of params.certificationIds) query.append("certificationIds", String(id));
    if (params.certificationIds.length > 0)
      query.set("certificationMatch", params.certificationMatch);
    for (const id of params.siteIds) query.append("siteIds", String(id));
    if (params.includeDeleted) query.set("includeDeleted", "true");
    query.set("page", String(page));
    return `/resumes?${query.toString()}`;
  };

  const hasMatchColumns =
    params.skillIds.length > 0 || params.certificationIds.length > 0 || params.siteIds.length > 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">経歴書一覧</h1>

      <form method="get" action="/resumes" className="card space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="form-label">氏名・カナ</label>
            <input
              className="form-input"
              name="name"
              defaultValue={params.name ?? ""}
              placeholder="部分一致"
            />
          </div>
          <div>
            <label className="form-label">所属組織（配下を含む）</label>
            <select
              className="form-input"
              name="departmentId"
              defaultValue={params.departmentId !== undefined ? String(params.departmentId) : ""}
            >
              <option value="">すべて</option>
              {departmentOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="form-label">経験年数（下限）</label>
              <input
                type="number"
                min={0}
                max={100}
                className="form-input"
                name="experienceYearsMin"
                defaultValue={
                  params.experienceYearsMin !== undefined ? String(params.experienceYearsMin) : ""
                }
              />
            </div>
            <span className="pb-2 text-sm text-slate-400">〜</span>
            <div className="flex-1">
              <label className="form-label">経験年数（上限）</label>
              <input
                type="number"
                min={0}
                max={100}
                className="form-input"
                name="experienceYearsMax"
                defaultValue={
                  params.experienceYearsMax !== undefined ? String(params.experienceYearsMax) : ""
                }
              />
            </div>
          </div>
          <div>
            <label className="form-label">スキル（複数選択可）</label>
            <MultiSelectDropdown
              name="skillIds"
              options={masters.skills.map((s) => ({ id: s.id, label: s.skillName }))}
              defaultValues={params.skillIds}
              placeholder="スキルを選択"
            />
            <div className="mt-1 flex gap-4 text-sm">
              <label className="flex items-center gap-1">
                <input type="radio" name="skillMatch" value="or" defaultChecked={params.skillMatch === "or"} />
                いずれか（OR）
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" name="skillMatch" value="and" defaultChecked={params.skillMatch === "and"} />
                すべて（AND）
              </label>
            </div>
          </div>
          <div>
            <label className="form-label">資格（複数選択可）</label>
            <MultiSelectDropdown
              name="certificationIds"
              options={masters.certifications.map((c) => ({ id: c.id, label: c.certificationName }))}
              defaultValues={params.certificationIds}
              placeholder="資格を選択"
            />
            <div className="mt-1 flex gap-4 text-sm">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="certificationMatch"
                  value="or"
                  defaultChecked={params.certificationMatch === "or"}
                />
                いずれか（OR）
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  name="certificationMatch"
                  value="and"
                  defaultChecked={params.certificationMatch === "and"}
                />
                すべて（AND）
              </label>
            </div>
          </div>
          <div>
            <label className="form-label">現場（複数選択可）</label>
            <MultiSelectDropdown
              name="siteIds"
              options={masters.sites.map((s) => ({ id: s.id, label: s.siteName }))}
              defaultValues={params.siteIds}
              placeholder="現場を選択"
            />
            <p className="mt-1 text-xs text-slate-400">過去にその現場にいた社員を検索できます</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="includeDeleted"
              value="true"
              defaultChecked={params.includeDeleted}
            />
            削除済みを表示
          </label>
          <button type="submit" className="btn-primary">
            検索
          </button>
          <Link href="/resumes" className="btn-secondary">
            クリア
          </Link>
        </div>
      </form>

      <p className="text-sm text-slate-500">{result.total}件</p>

      <table className="table-base">
        <thead>
          <tr>
            <th>社員ID</th>
            <th>氏名</th>
            <th>カナ</th>
            <th>所属組織</th>
            <th>経験年数</th>
            {hasMatchColumns && <th>ヒットしたスキル / 資格 / 現場</th>}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((row) => (
            <tr key={row.employeeId} className={row.deletedAt ? "opacity-50" : ""}>
              <td>{row.employeeId}</td>
              <td>
                {row.name}
                {row.deletedAt && <span className="ml-2 text-xs text-red-500">(削除済み)</span>}
              </td>
              <td>{row.nameKana}</td>
              <td>{row.department?.name ?? "-"}</td>
              <td>{row.experienceYears !== null ? `${row.experienceYears}年` : "-"}</td>
              {hasMatchColumns && (
                <td className="text-xs text-slate-600">
                  {[...row.matchedSkills, ...row.matchedCertifications, ...row.matchedSites].join(
                    "、"
                  ) || "-"}
                </td>
              )}
              <td>
                {row.canViewDetail ? (
                  <Link href={`/resumes/${row.employeeId}`} className="text-brand-600 hover:underline">
                    詳細
                  </Link>
                ) : (
                  <span
                    className="cursor-not-allowed text-slate-300"
                    title="他部署の経歴書詳細は閲覧できません"
                  >
                    詳細
                  </span>
                )}
              </td>
            </tr>
          ))}
          {result.items.length === 0 && (
            <tr>
              <td colSpan={hasMatchColumns ? 7 : 6} className="py-6 text-center text-slate-400">
                該当する社員がいません
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {result.page > 1 ? (
            <Link href={buildPageQuery(result.page - 1)} className="text-brand-600 hover:underline">
              前へ
            </Link>
          ) : (
            <span className="text-slate-300">前へ</span>
          )}
          <span className="text-slate-500">
            {result.page} / {totalPages}
          </span>
          {result.page < totalPages ? (
            <Link href={buildPageQuery(result.page + 1)} className="text-brand-600 hover:underline">
              次へ
            </Link>
          ) : (
            <span className="text-slate-300">次へ</span>
          )}
        </div>
      )}
    </div>
  );
}
