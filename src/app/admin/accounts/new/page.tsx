import { buildDepartmentTree, flattenDepartmentOptions, loadDepartments } from "@/lib/department-tree";
import { AccountForm } from "@/components/AccountForm";

/**
 * EDT006 新規アカウント登録（/admin/accounts/new、ADMINのみ）。
 * ADR 0009: 社員ID・氏名・カナ・メールアドレス（Azure AD照合キー）・所属部署・初期権限を入力し、
 * User＋Employeeを同一トランザクションで作成する（POST /api/accounts）。
 */
export default async function NewAccountPage() {
  const departmentRecords = await loadDepartments(false);
  const departmentOptions = flattenDepartmentOptions(buildDepartmentTree(departmentRecords));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">新規アカウント登録</h1>
      <AccountForm mode="create" departments={departmentOptions} />
    </div>
  );
}
