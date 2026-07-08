import Link from "next/link";
import { Role } from "@prisma/client";
import { buildDepartmentTree, flattenDepartmentOptions, loadDepartments } from "@/lib/department-tree";
import { searchAccounts, type AccountStatus, type AccountSearchParams } from "@/lib/account-search";

/**
 * REF007 アカウント一覧（/admin/accounts、ADMINのみ）。
 * 氏名（あいまい検索）、所属組織／権限／状態（複数選択）で絞込み（screens.md #8）。
 * EDT006（新規登録）/EDT007（編集）への導線を持つ。
 */

const PAGE_SIZE = 20;

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "GENERAL", label: "一般" },
  { value: "MANAGER", label: "管理職" },
  { value: "HR_SALES", label: "人事・営業" },
  { value: "ADMIN", label: "システム管理者" },
];

const STATUS_OPTIONS: { value: AccountStatus; label: string }[] = [
  { value: "ACTIVE", label: "有効" },
  { value: "INACTIVE", label: "無効" },
];

const ROLE_LABEL: Record<string, string> = {
  GENERAL: "一般",
  MANAGER: "管理職",
  HR_SALES: "人事・営業",
  ADMIN: "システム管理者",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function toArray(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function toIdList(value: string | string[] | undefined): number[] {
  return toArray(value)
    .map((v) => Number(v))
    .filter((v) => Number.isInteger(v) && v > 0);
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccountsAdminPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  const params: AccountSearchParams = {
    name: first(sp.name)?.trim() || undefined,
    departmentIds: toIdList(sp.departmentIds),
    roles: toArray(sp.roles).filter((r): r is Role => r in ROLE_LABEL) as Role[],
    statuses: toArray(sp.statuses).filter((s): s is AccountStatus => s === "ACTIVE" || s === "INACTIVE"),
    page: Math.max(1, Number(first(sp.page) ?? "1") || 1),
    pageSize: PAGE_SIZE,
  };

  const [departmentRecords, result] = await Promise.all([loadDepartments(false), searchAccounts(params)]);
  const departmentOptions = flattenDepartmentOptions(buildDepartmentTree(departmentRecords));
  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  const buildPageQuery = (page: number) => {
    const query = new URLSearchParams();
    if (params.name) query.set("name", params.name);
    for (const id of params.departmentIds) query.append("departmentIds", String(id));
    for (const r of params.roles) query.append("roles", r);
    for (const s of params.statuses) query.append("statuses", s);
    query.set("page", String(page));
    return `/admin/accounts?${query.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">アカウント管理</h1>
        <Link href="/admin/accounts/new" className="btn-primary">
          新規登録
        </Link>
      </div>

      <form method="get" action="/admin/accounts" className="card space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="form-label">氏名・カナ</label>
            <input className="form-input" name="name" defaultValue={params.name ?? ""} placeholder="部分一致" />
          </div>
          <div>
            <label className="form-label">所属組織（複数選択可）</label>
            <select className="form-input" name="departmentIds" multiple size={4} defaultValue={params.departmentIds.map(String)}>
              {departmentOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">権限（複数選択可）</label>
            <div className="flex flex-col gap-1">
              {ROLE_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="roles"
                    value={o.value}
                    defaultChecked={params.roles.includes(o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">状態（複数選択可）</label>
            <div className="flex gap-4">
              {STATUS_OPTIONS.map((o) => (
                <label key={o.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="statuses"
                    value={o.value}
                    defaultChecked={params.statuses.includes(o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary">
            検索
          </button>
          <Link href="/admin/accounts" className="btn-secondary">
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
            <th>メールアドレス</th>
            <th>所属組織</th>
            <th>権限</th>
            <th>状態</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {result.items.map((row) => (
            <tr key={row.employeeId} className={row.isActive ? "" : "opacity-50"}>
              <td>{row.employeeId}</td>
              <td>{row.name}</td>
              <td>{row.nameKana}</td>
              <td>{row.email}</td>
              <td>{row.department?.name ?? "-"}</td>
              <td>{ROLE_LABEL[row.role] ?? row.role}</td>
              <td>{row.isActive ? "有効" : "無効"}</td>
              <td>
                <Link href={`/admin/accounts/${row.employeeId}/edit`} className="text-brand-600 hover:underline">
                  編集
                </Link>
              </td>
            </tr>
          ))}
          {result.items.length === 0 && (
            <tr>
              <td colSpan={8} className="py-6 text-center text-slate-400">
                該当するアカウントがありません
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
