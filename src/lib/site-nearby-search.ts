import { prisma } from "@/lib/prisma";
import { fetchStationGeo, type StationGeo } from "@/lib/heartrails";

/**
 * REF009 現場/参画者一覧の検索ロジック。
 * 経路計算(所要時間・乗換回数)は行わず、(1) 現場最寄駅からの直線距離が近い社員 と
 * (2) 現場最寄駅と同じ路線に住む社員 の2条件でGoogleマップに表示する対象を絞り込む
 * （docs/decisions.md「経路・所要時間計算をやめた理由」参照）。
 * 緯度経度の取得は新規の外部サービス登録が不要な既存のHeartRails Express APIを流用する。
 */

export type SiteNearbyEmployee = {
  employeeId: string;
  name: string;
  department: string | null;
  currentSiteName: string | null;
  nearestStationLine: string;
  nearestStationName: string;
  skills: string[];
  lat: number;
  lng: number;
  distanceKm: number;
  matchedNearby: boolean;
  matchedSameLine: boolean;
};

export type SiteNearbyResult = {
  site: { id: number; name: string; stationLabel: string; lat: number; lng: number } | null;
  employees: SiteNearbyEmployee[];
  unresolvedStationCount: number;
};

const EARTH_RADIUS_KM = 6371;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, h)));
}

function stationKey(line: string | null, name: string): string {
  return `${line ?? ""}|${name}`;
}

export async function searchSiteNearbyEmployees(
  siteId: number,
  radiusKm: number
): Promise<SiteNearbyResult> {
  const site = await prisma.site.findUnique({
    where: { id: siteId, deletedAt: null },
    select: { id: true, siteName: true, nearestStationLine: true, nearestStationName: true },
  });
  if (!site || !site.nearestStationName) {
    return { site: null, employees: [], unresolvedStationCount: 0 };
  }

  const siteGeo = await fetchStationGeo(site.nearestStationName, site.nearestStationLine ?? undefined);
  if (!siteGeo) {
    return { site: null, employees: [], unresolvedStationCount: 0 };
  }

  const employees = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      nearestStationName: { not: null },
      user: { is: { isActive: true } },
    },
    select: {
      employeeId: true,
      name: true,
      nearestStationLine: true,
      nearestStationName: true,
      department: { select: { departmentName: true } },
      projects: {
        where: { deletedAt: null, endDate: null },
        orderBy: { startDate: "desc" },
        take: 1,
        select: { site: { select: { siteName: true } } },
      },
      skillLinks: {
        where: { deletedAt: null },
        select: { skill: { select: { skillName: true } } },
      },
    },
  });

  // 最寄駅文字列ごとに1回だけ座標解決する（同じ駅に住む社員が多いため呼び出し回数を削減）
  const distinctStations = new Map<string, { line: string | null; name: string }>();
  for (const e of employees) {
    if (!e.nearestStationName) continue;
    const key = stationKey(e.nearestStationLine, e.nearestStationName);
    if (!distinctStations.has(key)) {
      distinctStations.set(key, { line: e.nearestStationLine, name: e.nearestStationName });
    }
  }

  const geoByKey = new Map<string, StationGeo | null>();
  await Promise.all(
    Array.from(distinctStations.entries()).map(async ([key, station]) => {
      const geo = await fetchStationGeo(station.name, station.line ?? undefined);
      geoByKey.set(key, geo);
    })
  );

  let unresolvedStationCount = 0;
  for (const geo of geoByKey.values()) {
    if (!geo) unresolvedStationCount++;
  }

  const results: SiteNearbyEmployee[] = [];
  for (const e of employees) {
    if (!e.nearestStationName) continue;
    const key = stationKey(e.nearestStationLine, e.nearestStationName);
    const geo = geoByKey.get(key);
    if (!geo) continue;

    const distanceKm = haversineKm(siteGeo, geo);
    const matchedNearby = distanceKm <= radiusKm;
    const matchedSameLine =
      !!e.nearestStationLine && e.nearestStationLine === site.nearestStationLine;
    if (!matchedNearby && !matchedSameLine) continue;

    results.push({
      employeeId: e.employeeId,
      name: e.name,
      department: e.department?.departmentName ?? null,
      currentSiteName: e.projects[0]?.site.siteName ?? null,
      nearestStationLine: e.nearestStationLine ?? "",
      nearestStationName: e.nearestStationName,
      skills: [...new Set(e.skillLinks.map((l) => l.skill.skillName))],
      lat: geo.lat,
      lng: geo.lng,
      distanceKm: Math.round(distanceKm * 10) / 10,
      matchedNearby,
      matchedSameLine,
    });
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    site: {
      id: site.id,
      name: site.siteName,
      stationLabel: `${site.nearestStationLine ?? ""} ${site.nearestStationName}`.trim(),
      lat: siteGeo.lat,
      lng: siteGeo.lng,
    },
    employees: results,
    unresolvedStationCount,
  };
}
