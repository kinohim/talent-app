"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorList, FormActions } from "@/components/resume-edit/patch-section";

/**
 * EDT006（新規アカウント登録）／EDT007（アカウント編集）共通フォーム。
 * screens.md #15/#16、ADR 0009: EDT006はUser＋Employee最小項目（氏名・カナ含む）を同時作成。
 * EDT007は所属部署・権限の変更、退職・無効化（isActive）処理のみを扱う（氏名等は編集不可）。
 */

const ROLE_OPTIONS = [
  { value: "GENERAL", label: "一般" },
  { value: "MANAGER", label: "管理職" },
  { value: "HR_SALES", label: "人事・営業" },
  { value: "ADMIN", label: "システム管理者" },
];

type InitialData = {
  employeeId: string;
  name: string;
  nameKana: string;
  email: string;
  departmentId: number | null;
  role: string;
  isActive: boolean;
};

async function submitJson(url: string, method: "POST" | "PATCH", payload: unknown) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) return null;
  const data = await res.json().catch(() => null);
  const details: { message: string }[] | undefined = data?.error?.details;
  if (details && details.length > 0) return details.map((d) => d.message);
  return [data?.error?.message ?? "保存に失敗しました"];
}

export function AccountForm({
  mode,
  departments,
  initialData,
}: {
  mode: "create" | "edit";
  departments: { id: number; label: string }[];
  initialData?: InitialData;
}) {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState(initialData?.employeeId ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [nameKana, setNameKana] = useState(initialData?.nameKana ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [departmentId, setDepartmentId] = useState(
    initialData?.departmentId ? String(initialData.departmentId) : ""
  );
  const [role, setRole] = useState(initialData?.role ?? "GENERAL");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const result =
      mode === "create"
        ? await submitJson("/api/accounts", "POST", {
            employeeId: employeeId.trim(),
            name: name.trim(),
            nameKana: nameKana.trim(),
            email: email.trim(),
            departmentId: departmentId ? Number(departmentId) : null,
            role,
          })
        : await submitJson(`/api/accounts/${initialData!.employeeId}`, "PATCH", {
            departmentId: departmentId ? Number(departmentId) : null,
            role,
            isActive,
          });

    setSubmitting(false);
    if (result) {
      setErrors(result);
      return;
    }

    router.push("/admin/accounts");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section className="card space-y-4">
        <h2 className="font-semibold">アカウント情報</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">社員ID {mode === "create" && <span className="text-red-500">*</span>}</label>
            {mode === "create" ? (
              <input
                className="form-input"
                value={employeeId}
                maxLength={6}
                placeholder="例: 000006"
                onChange={(e) => setEmployeeId(e.target.value)}
                required
              />
            ) : (
              <p className="form-input bg-slate-50 text-slate-500">{initialData?.employeeId}</p>
            )}
          </div>
          <div>
            <label className="form-label">メールアドレス {mode === "create" && <span className="text-red-500">*</span>}</label>
            {mode === "create" ? (
              <input
                type="email"
                className="form-input"
                value={email}
                maxLength={255}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            ) : (
              <p className="form-input bg-slate-50 text-slate-500">{initialData?.email}（変更不可）</p>
            )}
          </div>
          <div>
            <label className="form-label">氏名 {mode === "create" && <span className="text-red-500">*</span>}</label>
            {mode === "create" ? (
              <input
                className="form-input"
                value={name}
                maxLength={50}
                onChange={(e) => setName(e.target.value)}
                required
              />
            ) : (
              <p className="form-input bg-slate-50 text-slate-500">{initialData?.name}（変更不可）</p>
            )}
          </div>
          <div>
            <label className="form-label">カナ {mode === "create" && <span className="text-red-500">*</span>}</label>
            {mode === "create" ? (
              <input
                className="form-input"
                value={nameKana}
                maxLength={50}
                onChange={(e) => setNameKana(e.target.value)}
                required
              />
            ) : (
              <p className="form-input bg-slate-50 text-slate-500">{initialData?.nameKana}（変更不可）</p>
            )}
          </div>
          <div>
            <label className="form-label">所属部署</label>
            <select
              className="form-input"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">未設定</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">権限 *</label>
            <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)} required>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {mode === "edit" && (
            <div>
              <label className="form-label">状態</label>
              <select
                className="form-input"
                value={isActive ? "ACTIVE" : "INACTIVE"}
                onChange={(e) => setIsActive(e.target.value === "ACTIVE")}
              >
                <option value="ACTIVE">有効</option>
                <option value="INACTIVE">無効化（退職等）</option>
              </select>
            </div>
          )}
        </div>
      </section>

      <ErrorList errors={errors} />
      <FormActions submitting={submitting} onCancel={() => router.push("/admin/accounts")} />
    </form>
  );
}
