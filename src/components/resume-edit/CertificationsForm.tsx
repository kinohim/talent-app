"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorList, FormActions, patchEmployeeSection } from "./patch-section";

/**
 * EDT004 資格登録（/resumes/[employeeId]/edit/certifications）。
 * 資格マスタから選択して取得資格・取得年月日・有効期限を登録（複数件）。
 * 取得日 ≤ 有効期限のバリデーションはサーバー側（certificationsSectionSchema）と共通。
 */

type CertificationMaster = {
  id: number;
  certificationName: string;
  categoryName: string;
};

type DateLike = string | Date | null;

type CertRow = { certificationId: number; acquiredDate: string; expirationDate: string };

function toDateInputValue(value: DateLike): string {
  if (!value) return "";
  const iso = value instanceof Date ? value.toISOString() : value;
  return iso.slice(0, 10);
}

export function CertificationsForm({
  employeeId,
  initialCertifications,
  certificationMasters,
  redirectTo,
}: {
  employeeId: string;
  initialCertifications: {
    certificationId: number;
    acquiredDate: DateLike;
    expirationDate: DateLike;
  }[];
  certificationMasters: CertificationMaster[];
  redirectTo: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<CertRow[]>(
    initialCertifications.map((c) => ({
      certificationId: c.certificationId,
      acquiredDate: toDateInputValue(c.acquiredDate),
      expirationDate: toDateInputValue(c.expirationDate),
    }))
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function addRow() {
    if (certificationMasters.length === 0) return;
    setRows((prev) => [
      ...prev,
      { certificationId: certificationMasters[0].id, acquiredDate: "", expirationDate: "" },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const result = await patchEmployeeSection(employeeId, {
      certifications: rows.map((r) => ({
        certificationId: r.certificationId,
        acquiredDate: r.acquiredDate || null,
        expirationDate: r.expirationDate || null,
      })),
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
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">保有資格</h2>
          <button type="button" className="btn-secondary" onClick={addRow}>
            追加
          </button>
        </div>
        {rows.map((row, idx) => (
          <div key={idx} className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-3">
            <div className="min-w-[220px]">
              <label className="form-label">資格</label>
              <select
                className="form-input"
                value={row.certificationId}
                onChange={(e) => {
                  const certificationId = Number(e.target.value);
                  setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, certificationId } : r)));
                }}
              >
                {certificationMasters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.categoryName} / {c.certificationName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">取得年月日</label>
              <input
                type="date"
                className="form-input"
                value={row.acquiredDate}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, acquiredDate: e.target.value } : r))
                  )
                }
              />
            </div>
            <div>
              <label className="form-label">有効期限日</label>
              <input
                type="date"
                className="form-input"
                value={row.expirationDate}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, expirationDate: e.target.value } : r))
                  )
                }
              />
            </div>
            <button
              type="button"
              className="text-red-600 hover:underline"
              onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
            >
              削除
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-400">登録されている資格はありません</p>}
      </section>

      <ErrorList errors={errors} />
      <FormActions submitting={submitting} onCancel={() => router.push(redirectTo)} />
    </form>
  );
}
