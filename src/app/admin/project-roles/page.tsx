import { prisma } from "@/lib/prisma";
import { AdminMasterTable, type AdminRecord } from "@/components/AdminMasterTable";

/**
 * MST003 現場ポジションマスタ管理（/admin/project-roles）。
 * 名称のみの単純マスタとしてAdminMasterTable共通コンポーネントに従う（detailed-design.md 3章）。
 */
export default async function ProjectRolesAdminPage() {
  const roles = await prisma.projectRole.findMany({
    where: { deletedAt: null },
    orderBy: { roleName: "asc" },
  });

  const items: AdminRecord[] = roles.map((r) => ({ id: r.id, roleName: r.roleName }));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">現場ポジション管理</h1>
      <AdminMasterTable
        resourceLabel="現場ポジション"
        apiBase="/api/project-roles"
        initialItems={items}
        columns={[{ key: "roleName", label: "役割名" }]}
        fields={[{ name: "roleName", label: "役割名", type: "text", required: true, maxLength: 100 }]}
      />
    </div>
  );
}
