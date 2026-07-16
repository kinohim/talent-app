import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { buildDepartmentTree, flattenDepartmentOptions, loadDepartments } from "@/lib/department-tree";
import {
  extractRiskSkills,
  getCertificationCategorySummary,
  getScopedMemberCount,
  getSkillCategoryHeatmap,
  getSkillDashboard,
  summarizeDashboard,
} from "@/lib/dashboard";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { CertificationPanel } from "@/components/dashboard/CertificationPanel";
import { SkillRankingPanel } from "@/components/dashboard/SkillRankingPanel";
import { HeatmapPanel } from "@/components/dashboard/HeatmapPanel";
import { RiskPanel } from "@/components/dashboard/RiskPanel";

/**
 * REF008 スキルマップ／組織ダッシュボード（/dashboard）。
 * ログイン済み全員アクセス可（screens.md）。組織（部署ツリー、配下含む）でフィルタし、
 * サマリー・資格カテゴリ別集計・スキル別保有者数ランキング・部署×スキルカテゴリのヒートマップ・
 * 属人化リスク一覧(保有者1名のスキル)を表示する。
 * 保有者名はcanViewDetail=trueのみ経歴書詳細へのリンクを活性化する（ADR 0008、REF002と同じ扱い）。
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const sp = await searchParams;
  const departmentIdRaw = first(sp.departmentId);
  const departmentId =
    departmentIdRaw && departmentIdRaw.trim() !== "" ? Number(departmentIdRaw) : undefined;

  const [departments, skillItems, certificationCategories, heatmap, memberCount] =
    await Promise.all([
      loadDepartments(false),
      getSkillDashboard(session, departmentId),
      getCertificationCategorySummary(session, departmentId),
      getSkillCategoryHeatmap(session, departmentId),
      getScopedMemberCount(departmentId),
    ]);
  const departmentOptions = flattenDepartmentOptions(buildDepartmentTree(departments));
  const summary = summarizeDashboard(memberCount, skillItems, certificationCategories);
  const riskSkills = extractRiskSkills(skillItems);

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

      <SummaryCards summary={summary} />
      <CertificationPanel categories={certificationCategories} />
      <SkillRankingPanel items={skillItems} categories={heatmap.columns} />
      <HeatmapPanel heatmap={heatmap} />
      <RiskPanel riskSkills={riskSkills} />
    </div>
  );
}
