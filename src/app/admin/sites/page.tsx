import { prisma } from "@/lib/prisma";
import { AdminMasterTable, type AdminRecord } from "@/components/AdminMasterTable";

/**
 * MST005 現場マスタ管理（/admin/sites、ADR 0007で新設）。
 * AdminMasterTable共通コンポーネントに従う（detailed-design.md 3章）。
 * 最寄り駅・住所カラムを追加（2026-07、xlsxレビュー指摘対応）。
 */
export default async function SitesAdminPage() {
  const sites = await prisma.site.findMany({
    where: { deletedAt: null },
    include: { nearestStation: true },
    orderBy: { siteName: "asc" },
  });

  const items: AdminRecord[] = sites.map((s) => ({
    id: s.id,
    siteName: s.siteName,
    nearestStationName: s.nearestStation?.stationName ?? null,
    address: s.address,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">現場管理</h1>
      <AdminMasterTable
        resourceLabel="現場"
        apiBase="/api/sites"
        initialItems={items}
        columns={[
          { key: "siteName", label: "現場名" },
          { key: "nearestStationName", label: "最寄り駅" },
          { key: "address", label: "住所" },
        ]}
        fields={[
          { name: "siteName", label: "現場名", type: "text", required: true, maxLength: 100 },
          { name: "nearestStationId", label: "最寄り駅", type: "station-search", displayKey: "nearestStationName" },
          { name: "address", label: "住所", type: "text", maxLength: 255, nullable: true },
        ]}
      />
    </div>
  );
}
