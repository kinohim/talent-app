import { prisma } from "@/lib/prisma";
import { AdminMasterTable, type AdminRecord } from "@/components/AdminMasterTable";

/**
 * MST005 現場マスタ管理（/admin/sites、ADR 0007で新設）。
 * 名称のみの単純マスタとしてAdminMasterTable共通コンポーネントに従う（detailed-design.md 3章）。
 */
export default async function SitesAdminPage() {
  const sites = await prisma.site.findMany({ where: { deletedAt: null }, orderBy: { siteName: "asc" } });

  const items: AdminRecord[] = sites.map((s) => ({ id: s.id, siteName: s.siteName }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">現場管理</h1>
      <AdminMasterTable
        resourceLabel="現場"
        apiBase="/api/sites"
        initialItems={items}
        columns={[{ key: "siteName", label: "現場名" }]}
        fields={[{ name: "siteName", label: "現場名", type: "text", required: true, maxLength: 100 }]}
      />
    </div>
  );
}
