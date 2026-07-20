"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: { maps: typeof google.maps };
  }
}

/**
 * REF009 現場/参画者一覧のGoogleマップ＋結果一覧。
 * Googleは地図描画のみに使う（経路計算は行わない、docs/decisions.md参照）。
 * design/genbaモックアップのscript.js（現場ピン・社員ピン表示、地図で見るボタンでパン/ズーム）をReact化したもの。
 */

export type SiteNearbyEmployeeView = {
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

export type SiteNearbyInfo = {
  id: number;
  name: string;
  stationLabel: string;
  lat: number;
  lng: number;
};

type Props = {
  site: SiteNearbyInfo;
  employees: SiteNearbyEmployeeView[];
  radiusKm: number;
};

let scriptLoadPromise: Promise<void> | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Mapsの読み込みに失敗しました"));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

function badgeLabel(e: SiteNearbyEmployeeView): string {
  if (e.matchedNearby && e.matchedSameLine) return "近隣・同一路線";
  if (e.matchedNearby) return "近隣";
  return "同一路線";
}

export function SiteNearbyMap({ site, employees, radiusKm }: Props) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Google Maps APIキー（NEXT_PUBLIC_GOOGLE_MAPS_API_KEY）が設定されていません");
      return;
    }

    let cancelled = false;

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (cancelled || !mapDivRef.current || !window.google) return;

        const map = new window.google.maps.Map(mapDivRef.current, {
          center: { lat: site.lat, lng: site.lng },
          zoom: 12,
        });
        mapRef.current = map;

        new window.google.maps.Marker({
          position: { lat: site.lat, lng: site.lng },
          map,
          title: `現場: ${site.name}（${site.stationLabel}）`,
          icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
        });

        for (const emp of employees) {
          new window.google.maps.Marker({
            position: { lat: emp.lat, lng: emp.lng },
            map,
            title: `${emp.name}（${badgeLabel(emp)}）`,
            icon: `http://maps.google.com/mapfiles/ms/icons/${emp.matchedNearby ? "blue" : "green"}-dot.png`,
          });
        }
      })
      .catch((err: Error) => setError(err.message));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.id, site.lat, site.lng]);

  const focusEmployee = (emp: SiteNearbyEmployeeView) => {
    const map = mapRef.current;
    if (!map) return;
    map.panTo({ lat: emp.lat, lng: emp.lng });
    map.setZoom(15);
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[45%_55%]">
      <div className="card">
        <h2 className="mb-3 font-semibold">最寄駅マップ</h2>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <div ref={mapDivRef} className="h-[500px] w-full rounded border border-slate-200 bg-slate-50" />
        )}
      </div>

      <div className="card max-h-[600px] space-y-3 overflow-auto">
        <h2 className="font-semibold">
          検索結果（{employees.length}件・{radiusKm}km圏内 または 同一路線）
        </h2>
        {employees.length === 0 && <p className="text-sm text-slate-400">該当する社員がいません</p>}
        {employees.map((emp) => (
          <div key={emp.employeeId} className="rounded border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold text-brand-700">{emp.name}</h3>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                {badgeLabel(emp)}
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <th className="w-24 py-1 text-left text-slate-500">所属</th>
                  <td>{emp.department ?? "-"}</td>
                </tr>
                <tr>
                  <th className="py-1 text-left text-slate-500">現在参画中</th>
                  <td>{emp.currentSiteName ?? "-"}</td>
                </tr>
                <tr>
                  <th className="py-1 text-left text-slate-500">最寄駅</th>
                  <td>
                    {emp.nearestStationLine} {emp.nearestStationName}
                  </td>
                </tr>
                <tr>
                  <th className="py-1 text-left text-slate-500">距離</th>
                  <td>約{emp.distanceKm}km</td>
                </tr>
                {emp.skills.length > 0 && (
                  <tr>
                    <th className="py-1 text-left text-slate-500">スキル</th>
                    <td>{emp.skills.join(" / ")}</td>
                  </tr>
                )}
              </tbody>
            </table>
            <button type="button" onClick={() => focusEmployee(emp)} className="btn-secondary text-xs">
              地図で見る
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
