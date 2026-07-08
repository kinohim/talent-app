import { prisma } from "@/lib/prisma";
import { AdminMasterTable, type AdminRecord } from "@/components/AdminMasterTable";

export default async function SkillsAdminPage() {
  const [categories, skills] = await Promise.all([
    prisma.skillCategory.findMany({ where: { deletedAt: null }, orderBy: { code: "asc" } }),
    prisma.skill.findMany({
      where: { deletedAt: null },
      include: { category: true },
      orderBy: { skillName: "asc" },
    }),
  ]);

  const categoryItems: AdminRecord[] = categories.map((c) => ({
    id: c.id,
    code: c.code,
    categoryName: c.categoryName,
  }));

  const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.categoryName }));

  const skillItems: AdminRecord[] = skills.map((s) => ({
    id: s.id,
    categoryId: s.categoryId,
    categoryName: s.category.categoryName,
    skillName: s.skillName,
    hasVersion: s.hasVersion,
  }));

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-bold">スキル管理</h1>

      <section className="space-y-4">
        <AdminMasterTable
          resourceLabel="スキルカテゴリ"
          apiBase="/api/skill-categories"
          initialItems={categoryItems}
          columns={[
            { key: "code", label: "カテゴリコード" },
            { key: "categoryName", label: "カテゴリ名" },
          ]}
          fields={[
            { name: "code", label: "カテゴリコード", type: "text", required: true, maxLength: 10 },
            { name: "categoryName", label: "カテゴリ名", type: "text", required: true, maxLength: 100 },
          ]}
        />
      </section>

      <section className="space-y-4">
        <AdminMasterTable
          resourceLabel="スキル"
          apiBase="/api/skills"
          initialItems={skillItems}
          columns={[
            { key: "categoryName", label: "カテゴリ" },
            { key: "skillName", label: "スキル名" },
            { key: "hasVersion", label: "バージョン管理", format: "boolean-yes-no" },
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
            { name: "skillName", label: "スキル名", type: "text", required: true, maxLength: 100 },
            { name: "hasVersion", label: "バージョン管理あり", type: "checkbox" },
          ]}
        />
      </section>
    </div>
  );
}
