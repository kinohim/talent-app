import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { requireManagerOrAdmin } from "@/lib/authz";
import { Forbidden } from "@/components/Forbidden";
import { prisma } from "@/lib/prisma";
import { searchSiteNearbyEmployees } from "@/lib/site-nearby-search";
import { SiteNearbyMap } from "@/components/site-search/SiteNearbyMap";

/**
 * REF009 現場/参画者一覧（/site-search、ADMIN/MANAGERのみ）。
 * 経路計算(所要時間・乗換回数)は行わず、現場最寄駅からの直線距離が近い社員・
 * 現場最寄駅と同じ路線に住む社員をGoogleマップ上に表示する（docs/screens.md REF009参照）。
 */

const RADIUS_OPTIONS = [3, 5, 10, 20] as const;
const DEFAULT_RADIUS: number = 5;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function SiteSearchPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!requireManagerOrAdmin(session)) {
    return <Forbidden message="現場/参画者一覧はシステム管理者・管理職のみ閲覧できます" />;
  }

  const sp = await searchParams;

  const sites = await prisma.site.findMany({
    where: { deletedAt: null },
    orderBy: { siteName: "asc" },
    select: { id: true, siteName: true },
  });

  const siteIdRaw = first(sp.siteId);
  const siteId = siteIdRaw ? Number(siteIdRaw) : sites[0]?.id;

  const radiusRaw = Number(first(sp.radiusKm));
  const radiusKm: number = (RADIUS_OPTIONS as readonly number[]).includes(radiusRaw)
    ? radiusRaw
    : DEFAULT_RADIUS;

  const result = siteId
    ? await searchSiteNearbyEmployees(siteId, radiusKm)
    : { site: null, employees: [], unresolvedStationCount: 0 };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">現場/参画者一覧</h1>
        <p className="text-sm text-slate-500">
          現場を選択すると、最寄駅の近隣に住む社員・同じ路線に住む社員を地図で確認できます。
        </p>
      </div>

      {sites.length === 0 ? (
        <p className="card text-sm text-slate-400">現場マスタが未登録です（現場管理から登録してください）。</p>
      ) : (
        <form method="get" action="/site-search" className="card flex flex-wrap items-end gap-4">
          <div>
            <label className="form-label">現場</label>
            <select name="siteId" defaultValue={siteId} className="form-input">
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.siteName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">近隣とみなす範囲</label>
            <select name="radiusKm" defaultValue={radiusKm} className="form-input">
              {RADIUS_OPTIONS.map((km) => (
                <option key={km} value={km}>
                  {km}km以内
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">
            検索
          </button>
        </form>
      )}

      {siteId && !result.site && (
        <p className="card text-sm text-red-600">
          現場の最寄駅情報が未設定か、駅の位置情報を取得できませんでした。現場管理（MST005）で最寄駅を確認してください。
        </p>
      )}

      {result.site && (
        <>
          {result.unresolvedStationCount > 0 && (
            <p className="text-xs text-slate-400">
              {result.unresolvedStationCount}名の最寄駅は位置情報を取得できなかったため地図・一覧から除外しています。
            </p>
          )}
          <SiteNearbyMap site={result.site} employees={result.employees} radiusKm={radiusKm} />
        </>
      )}
    </div>
  );
}
