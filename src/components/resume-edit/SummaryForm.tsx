"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorList, FormActions, patchEmployeeSection } from "./patch-section";

/**
 * EDT002 経歴概要・自己PR登録（/resumes/[employeeId]/edit/summary）。
 * 経歴概要・自己PRの自由記述テキスト（各2000文字以内、detailed-design.md EDT002）。
 */
export function SummaryForm({
  employeeId,
  initialCareerSummary,
  initialSelfPr,
  redirectTo,
}: {
  employeeId: string;
  initialCareerSummary: string | null;
  initialSelfPr: string | null;
  redirectTo: string;
}) {
  const router = useRouter();
  const [careerSummary, setCareerSummary] = useState(initialCareerSummary ?? "");
  const [selfPr, setSelfPr] = useState(initialSelfPr ?? "");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const result = await patchEmployeeSection(employeeId, {
      summary: {
        careerSummary: careerSummary.trim() || null,
        selfPr: selfPr.trim() || null,
      },
    });
    setSubmitting(false);

    if (result) {
      setErrors(result);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="card space-y-4">
        <div>
          <label className="form-label">経歴概要（2000文字以内）</label>
          <textarea
            className="form-input"
            rows={8}
            maxLength={2000}
            value={careerSummary}
            onChange={(e) => setCareerSummary(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label">自己PR（2000文字以内）</label>
          <textarea
            className="form-input"
            rows={8}
            maxLength={2000}
            value={selfPr}
            onChange={(e) => setSelfPr(e.target.value)}
          />
        </div>
      </section>

      <ErrorList errors={errors} />
      <FormActions submitting={submitting} onCancel={() => router.push(redirectTo)} />
    </form>
  );
}
