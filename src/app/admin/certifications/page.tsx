import { prisma } from "@/lib/prisma";
import { AdminMasterTable, type AdminRecord } from "@/components/AdminMasterTable";

export default async function CertificationsAdminPage() {
  const [categories, certifications] = await Promise.all([
    prisma.certificationCategory.findMany({ where: { deletedAt: null }, orderBy: { code: "asc" } }),
    prisma.certification.findMany({
      where: { deletedAt: null },
      include: { category: true },
      orderBy: { certificationName: "asc" },
    }),
  ]);

  const categoryItems: AdminRecord[] = categories.map((c) => ({
    id: c.id,
    code: c.code,
    categoryName: c.categoryName,
    description: c.description,
  }));

  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.categoryName }));

  const certificationItems: AdminRecord[] = certifications.map((c) => ({
    id: c.id,
    categoryId: c.categoryId,
    categoryName: c.category.categoryName,
    certificationName: c.certificationName,
    certificationOrganization: c.certificationOrganization,
  }));

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-bold">資格管理</h1>

      <section className="space-y-4">
        <AdminMasterTable
          resourceLabel="資格カテゴリ"
          apiBase="/api/certification-categories"
          initialItems={categoryItems}
          columns={[
            { key: "code", label: "カテゴリコード" },
            { key: "categoryName", label: "カテゴリ名" },
            { key: "description", label: "説明" },
          ]}
          fields={[
            { name: "code", label: "カテゴリコード", type: "text", required: true, maxLength: 10 },
            { name: "categoryName", label: "カテゴリ名", type: "text", required: true, maxLength: 100 },
            { name: "description", label: "説明", type: "text", maxLength: 255, nullable: true },
          ]}
        />
      </section>

      <section className="space-y-4">
        <AdminMasterTable
          resourceLabel="資格"
          apiBase="/api/certifications"
          initialItems={certificationItems}
          columns={[
            { key: "categoryName", label: "カテゴリ" },
            { key: "certificationName", label: "資格名" },
            { key: "certificationOrganization", label: "認定団体" },
          ]}
          fields={[
            {
              name: "categoryId",
              label: "カテゴリ",
              type: "select",
              required: true,
              valueType: "number",
              options: categoryOptions,
            },
            { name: "certificationName", label: "資格名", type: "text", required: true, maxLength: 100 },
            {
              name: "certificationOrganization",
              label: "認定団体",
              type: "text",
              maxLength: 100,
              nullable: true,
            },
          ]}
        />
      </section>
    </div>
  );
}
