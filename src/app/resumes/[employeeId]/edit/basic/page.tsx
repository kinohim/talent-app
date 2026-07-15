import { canEditDepartmentField } from "@/lib/authz";
import { serializeEmployeeDetail } from "@/lib/employee-select";
import { buildDepartmentTree, flattenDepartmentOptions, loadDepartments } from "@/lib/department-tree";
import { BasicInfoForm } from "@/components/resume-edit/BasicInfoForm";
import { Forbidden } from "@/components/Forbidden";
import { getEditContext } from "../edit-access";

type RouteParams = { params: Promise<{ employeeId: string }> };

/**
 * EDT001+EDT002 基本情報・経歴概要編集（/resumes/[employeeId]/edit/basic）。
 * マイページの編集メニューを減らすため、EDT002（経歴概要・自己PR）をこの画面に統合している。
 * 権限チェックはgetEditContext（一次: 未ログイン/存在チェック、最終判定はPATCH API側）。
 */
export default async function EditBasicPage({ params }: RouteParams) {
  const { employeeId } = await params;
  const { session, employee, allowed } = await getEditContext(employeeId);

  if (!allowed) {
    return <Forbidden message="この社員の経歴書を編集する権限がありません" />;
  }

  const departmentRecords = await loadDepartments(false);
  const departmentOptions = flattenDepartmentOptions(buildDepartmentTree(departmentRecords));
  const serialized = serializeEmployeeDetail(employee);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">基本情報・経歴概要編集</h1>
      <p className="text-sm text-slate-500">
        {serialized.name}（{employeeId}）
      </p>
      <BasicInfoForm
        initialData={serialized}
        canEditDepartment={canEditDepartmentField(session)}
        departments={departmentOptions}
        redirectTo={`/resumes/${employeeId}`}
      />
    </div>
  );
}
