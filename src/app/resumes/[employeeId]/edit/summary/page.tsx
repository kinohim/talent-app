import { serializeEmployeeDetail } from "@/lib/employee-select";
import { SummaryForm } from "@/components/resume-edit/SummaryForm";
import { Forbidden } from "@/components/Forbidden";
import { getEditContext } from "../edit-access";

type RouteParams = { params: Promise<{ employeeId: string }> };

/**
 * EDT002 経歴概要・自己PR登録（/resumes/[employeeId]/edit/summary）。
 */
export default async function EditSummaryPage({ params }: RouteParams) {
  const { employeeId } = await params;
  const { employee, allowed } = await getEditContext(employeeId);

  if (!allowed) {
    return <Forbidden message="この社員の経歴書を編集する権限がありません" />;
  }

  const serialized = serializeEmployeeDetail(employee);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">経歴概要・自己PR編集</h1>
      <p className="text-sm text-slate-500">
        {serialized.name}（{employeeId}）
      </p>
      <SummaryForm
        employeeId={employeeId}
        initialCareerSummary={serialized.careerSummary}
        initialSelfPr={serialized.selfPr}
        redirectTo={`/resumes/${employeeId}`}
      />
    </div>
  );
}
