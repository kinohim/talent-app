"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorList, FormActions, patchEmployeeSection } from "./patch-section";

/**
 * EDT003 スキル登録（/resumes/[employeeId]/edit/skills）。
 * スキルマスタから選択してスキル・バージョン・習熟度を登録（複数件、上限なし）。
 * 同一スキル+バージョンの重複はサーバー側バリデーション（skillsSectionSchema）で弾かれる。
 */

type SkillMaster = {
  id: number;
  skillName: string;
  versions: { id: number; versionName: string }[];
};

type SkillRow = { skillId: number; skillVersionId: number | null; skillLevel: string };

const SKILL_LEVEL_OPTIONS = [
  { value: "LOW", label: "△（基礎レベル）" },
  { value: "MID", label: "〇（実務経験あり）" },
  { value: "HIGH", label: "◎（指導・設計可能）" },
];

export function SkillsForm({
  employeeId,
  initialSkills,
  skillMasters,
  redirectTo,
}: {
  employeeId: string;
  initialSkills: { skillId: number; skillVersionId: number | null; skillLevel: string | null }[];
  skillMasters: SkillMaster[];
  redirectTo: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<SkillRow[]>(
    initialSkills.map((s) => ({
      skillId: s.skillId,
      skillVersionId: s.skillVersionId,
      skillLevel: s.skillLevel ?? "MID",
    }))
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function versionsFor(skillId: number) {
    return skillMasters.find((s) => s.id === skillId)?.versions ?? [];
  }

  function addRow() {
    if (skillMasters.length === 0) return;
    setRows((prev) => [...prev, { skillId: skillMasters[0].id, skillVersionId: null, skillLevel: "MID" }]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const result = await patchEmployeeSection(employeeId, {
      skills: rows.map((r) => ({
        skillId: r.skillId,
        skillVersionId: r.skillVersionId,
        skillLevel: r.skillLevel,
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
          <h2 className="font-semibold">保有スキル</h2>
          <button type="button" className="btn-secondary" onClick={addRow}>
            追加
          </button>
        </div>
        {rows.map((row, idx) => (
          <div key={idx} className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-3">
            <div className="min-w-[180px]">
              <label className="form-label">スキル</label>
              <select
                className="form-input"
                value={row.skillId}
                onChange={(e) => {
                  const skillId = Number(e.target.value);
                  setRows((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, skillId, skillVersionId: null } : r))
                  );
                }}
              >
                {skillMasters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.skillName}
                  </option>
                ))}
              </select>
            </div>
            {versionsFor(row.skillId).length > 0 && (
              <div className="min-w-[140px]">
                <label className="form-label">バージョン</label>
                <select
                  className="form-input"
                  value={row.skillVersionId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : null;
                    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, skillVersionId: v } : r)));
                  }}
                >
                  <option value="">未選択</option>
                  {versionsFor(row.skillId).map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.versionName}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="min-w-[180px]">
              <label className="form-label">習熟度</label>
              <select
                className="form-input"
                value={row.skillLevel}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, skillLevel: e.target.value } : r))
                  )
                }
              >
                {SKILL_LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
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
        {rows.length === 0 && <p className="text-sm text-slate-400">登録されているスキルはありません</p>}
      </section>

      <ErrorList errors={errors} />
      <FormActions submitting={submitting} onCancel={() => router.push(redirectTo)} />
    </form>
  );
}
