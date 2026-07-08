import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { buildDepartmentTree, flattenDepartmentOptions, loadDepartments } from "@/lib/department-tree";
import {
  getCertificationDashboard,
  getSkillDashboard,
  type DashboardHolder,
} from "@/lib/dashboard";

/**
 * REF008 スキルマップ／組織ダッシュボード（/dashboard）。
 * ログイン済み全員アクセス可（screens.md）。組織（部署ツリー、配下含む）でフィルタし、
 * スキル別・資格別の保有者数集計と保有者名一覧を表示する。
 * 保有者名はcanViewDetail=trueのみ経歴書詳細へのリンクを活性化する（ADR 0008、REF002と同じ扱い）。
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

type Row = {
  id: number;
  categoryName: string;
  label: string;
  count: number;
  holders: DashboardHolder[];
};

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const sp = await searchParams;
  const departmentIdRaw = first(sp.departmentId);
  const departmentId =
    departmentIdRaw && departmentIdRaw.trim() !== "" ? Number(departmentIdRaw) : undefined;

  const [departments, skillItems, certificationItems] = await Promise.all([
    loadDepartments(false),
    getSkillDashboard(session, departmentId),
    getCertificationDashboard(session, departmentId),
  ]);
  const departmentOptions = flattenDepartmentOptions(buildDepartmentTree(departments));

  const skillRows: Row[] = skillItems.map((item) => ({
    id: item.skillId,
    categoryName: item.categoryName,
    label: item.skillName,
    count: item.count,
    holders: item.holders,
  }));
  const certificationRows: Row[] = certificationItems.map((item) => ({
    id: item.certificationId,
    categoryName: item.categoryName,
    label: item.certificationName,
    count: item.count,
    holders: item.holders,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">スキルマップ／組織ダッシュボード</h1>

      <form method="get" action="/dashboard" className="card flex flex-wrap items-end gap-4">
        <div>
          <label className="form-label">組織（配下を含む）</label>
          <select
            className="form-input"
            name="departmentId"
            defaultValue={departmentId !== undefined ? String(departmentId) : ""}
          >
            <option value="">全社</option>
            {departmentOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-primary">
          絞り込み
        </button>
        {departmentId !== undefined && (
          <Link href="/dashboard" className="btn-secondary">
            クリア
          </Link>
        )}
      </form>

      <DashboardSection
        title="スキル別保有者数"
        emptyMessage="該当するスキル保有者がいません"
        rows={skillRows}
      />

      <DashboardSection
        title="資格別保有者数"
        emptyMessage="該当する資格保有者がいません"
        rows={certificationRows}
      />
    </div>
  );
}

function DashboardSection({
  title,
  rows,
  emptyMessage,
}: {
  title: string;
  rows: Row[];
  emptyMessage: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <table className="table-base">
        <thead>
          <tr>
            <th>カテゴリ</th>
            <th>名称</th>
            <th>保有者数</th>
            <th>保有者</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.categoryName}</td>
              <td>{row.label}</td>
              <td>{row.count}名</td>
              <td className="space-x-2 text-sm">
                {row.holders.length === 0 && <span className="text-slate-300">-</span>}
                {row.holders.map((holder) =>
                  holder.canViewDetail ? (
                    <Link
                      key={holder.employeeId}
                      href={`/resumes/${holder.employeeId}`}
                      className="text-brand-600 hover:underline"
                    >
                      {holder.name}
                    </Link>
                  ) : (
                    <span
                      key={holder.employeeId}
                      className="cursor-not-allowed text-slate-400"
                      title="他部署の経歴書詳細は閲覧できません"
                    >
                      {holder.name}
                    </span>
                  )
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-slate-400">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
