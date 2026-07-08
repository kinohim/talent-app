import { buildDepartmentTree, loadDepartments } from "@/lib/department-tree";
import { DepartmentTreeManager } from "@/components/DepartmentTreeManager";

/**
 * MST004 部署マスタ管理（/admin/departments）。
 * 事業部＞部署＞Grの3階層ツリーで表示・登録・編集・削除する（screens.md #20）。
 */
export default async function DepartmentsAdminPage() {
  const records = await loadDepartments(false);
  const tree = buildDepartmentTree(records);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">部署管理</h1>
      <DepartmentTreeManager initialTree={tree} />
    </div>
  );
}
