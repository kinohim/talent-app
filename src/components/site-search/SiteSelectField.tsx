"use client";

import { useState } from "react";

/**
 * REF009 現場/参画者一覧の「現場」プルダウン。
 * 選択した現場の最寄駅をフォーム送信前にその場で表示する（design/genbaモックアップの
 * 「現場最寄駅」readonly欄と同じ挙動をReactの状態管理で再現）。
 */

export type SiteOption = {
  id: number;
  siteName: string;
  nearestStationLine: string | null;
  nearestStationName: string | null;
};

type Props = {
  sites: SiteOption[];
  defaultSiteId: number | undefined;
};

function stationLabel(site: SiteOption | undefined): string {
  if (!site) return "-";
  if (!site.nearestStationName) return "未設定";
  return `${site.nearestStationLine ?? ""} ${site.nearestStationName}`.trim();
}

export function SiteSelectField({ sites, defaultSiteId }: Props) {
  const [selectedId, setSelectedId] = useState(defaultSiteId ?? sites[0]?.id);
  const selected = sites.find((s) => s.id === selectedId);

  return (
    <>
      <div>
        <label className="form-label">現場</label>
        <select
          name="siteId"
          defaultValue={defaultSiteId}
          className="form-input"
          onChange={(e) => setSelectedId(Number(e.target.value))}
        >
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.siteName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="form-label">現場最寄駅</label>
        <p className="form-input flex items-center bg-slate-50 text-slate-600">
          {stationLabel(selected)}
        </p>
      </div>
    </>
  );
}
