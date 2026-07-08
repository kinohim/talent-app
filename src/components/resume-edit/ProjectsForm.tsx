"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorList, FormActions, patchEmployeeSection } from "./patch-section";

/**
 * EDT005 プロジェクト経歴登録（/resumes/[employeeId]/edit/projects）。
 * screens.md「実装上の提案」: Projectを配列として動的に追加・削除できるリピーターUIとし、
 * 各行の展開先でProjectDetail（業務工程チェックボックス群）・ProjectRoleLink・ProjectSkillLinkを
 * 編集する入れ子フォームにする。PATCH /api/employees/[employeeId] の projects セクションに送信する。
 */

type DateLike = string | Date | null;

type SiteMaster = { id: number; siteName: string };
type RoleMaster = { id: number; roleName: string };
type SkillMaster = { id: number; skillName: string; versions: { id: number; versionName: string }[] };

type ProjectDetailState = {
  overview: string;
  researchAnalysis: boolean;
  requirementsDefinition: boolean;
  basicDesign: boolean;
  detailedDesign: boolean;
  development: boolean;
  testing: boolean;
  operation: boolean;
};

type ProjectRow = {
  siteId: number;
  projectTitle: string;
  projectSummary: string;
  startDate: string;
  endDate: string;
  totalTeamSize: string;
  teamSize: string;
  roleIds: number[];
  skillLinks: { skillId: number; skillVersionId: number | null }[];
  detail: ProjectDetailState;
};

type InitialProjectDetail = {
  overview: string | null;
  researchAnalysis: boolean | null;
  requirementsDefinition: boolean | null;
  basicDesign: boolean | null;
  detailedDesign: boolean | null;
  development: boolean | null;
  testing: boolean | null;
  operation: boolean | null;
} | null;

type InitialProject = {
  siteId: number;
  projectTitle: string;
  projectSummary: string | null;
  startDate: DateLike;
  endDate: DateLike;
  totalTeamSize: string | null;
  teamSize: string | null;
  roles: { projectRoleId: number }[];
  skills: { skillId: number; skillVersionId: number | null }[];
  detail: InitialProjectDetail;
};

const PROCESS_FIELDS: { key: keyof ProjectDetailState; label: string }[] = [
  { key: "researchAnalysis", label: "調査・分析" },
  { key: "requirementsDefinition", label: "要件定義" },
  { key: "basicDesign", label: "基本設計" },
  { key: "detailedDesign", label: "詳細設計" },
  { key: "development", label: "開発" },
  { key: "testing", label: "テスト" },
  { key: "operation", label: "運用" },
];

function toDateInputValue(value: DateLike): string {
  if (!value) return "";
  const iso = value instanceof Date ? value.toISOString() : value;
  return iso.slice(0, 10);
}

function emptyDetail(): ProjectDetailState {
  return {
    overview: "",
    researchAnalysis: false,
    requirementsDefinition: false,
    basicDesign: false,
    detailedDesign: false,
    development: false,
    testing: false,
    operation: false,
  };
}

function toRow(project: InitialProject): ProjectRow {
  return {
    siteId: project.siteId,
    projectTitle: project.projectTitle,
    projectSummary: project.projectSummary ?? "",
    startDate: toDateInputValue(project.startDate),
    endDate: toDateInputValue(project.endDate),
    totalTeamSize: project.totalTeamSize ?? "",
    teamSize: project.teamSize ?? "",
    roleIds: project.roles.map((r) => r.projectRoleId),
    skillLinks: project.skills.map((s) => ({ skillId: s.skillId, skillVersionId: s.skillVersionId })),
    detail: {
      overview: project.detail?.overview ?? "",
      researchAnalysis: project.detail?.researchAnalysis ?? false,
      requirementsDefinition: project.detail?.requirementsDefinition ?? false,
      basicDesign: project.detail?.basicDesign ?? false,
      detailedDesign: project.detail?.detailedDesign ?? false,
      development: project.detail?.development ?? false,
      testing: project.detail?.testing ?? false,
      operation: project.detail?.operation ?? false,
    },
  };
}

function newRow(siteMasters: SiteMaster[]): ProjectRow {
  return {
    siteId: siteMasters[0]?.id ?? 0,
    projectTitle: "",
    projectSummary: "",
    startDate: "",
    endDate: "",
    totalTeamSize: "",
    teamSize: "",
    roleIds: [],
    skillLinks: [],
    detail: emptyDetail(),
  };
}

export function ProjectsForm({
  employeeId,
  initialProjects,
  siteMasters,
  roleMasters,
  skillMasters,
  redirectTo,
}: {
  employeeId: string;
  initialProjects: InitialProject[];
  siteMasters: SiteMaster[];
  roleMasters: RoleMaster[];
  skillMasters: SkillMaster[];
  redirectTo: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ProjectRow[]>(initialProjects.map(toRow));
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function updateRow(index: number, patch: Partial<ProjectRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function updateDetail(index: number, patch: Partial<ProjectDetailState>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, detail: { ...r.detail, ...patch } } : r))
    );
  }

  function addProject() {
    if (siteMasters.length === 0) return;
    setRows((prev) => [...prev, newRow(siteMasters)]);
  }

  function removeProject(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleRole(index: number, roleId: number) {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const roleIds = r.roleIds.includes(roleId)
          ? r.roleIds.filter((id) => id !== roleId)
          : [...r.roleIds, roleId];
        return { ...r, roleIds };
      })
    );
  }

  function addSkillLink(index: number) {
    if (skillMasters.length === 0) return;
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? { ...r, skillLinks: [...r.skillLinks, { skillId: skillMasters[0].id, skillVersionId: null }] }
          : r
      )
    );
  }

  function updateSkillLink(index: number, skillIdx: number, patch: Partial<{ skillId: number; skillVersionId: number | null }>) {
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              skillLinks: r.skillLinks.map((sl, si) => (si === skillIdx ? { ...sl, ...patch } : sl)),
            }
          : r
      )
    );
  }

  function removeSkillLink(index: number, skillIdx: number) {
    setRows((prev) =>
      prev.map((r, i) =>
        i === index ? { ...r, skillLinks: r.skillLinks.filter((_, si) => si !== skillIdx) } : r
      )
    );
  }

  function versionsFor(skillId: number) {
    return skillMasters.find((s) => s.id === skillId)?.versions ?? [];
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const result = await patchEmployeeSection(employeeId, {
      projects: rows.map((r) => ({
        siteId: r.siteId,
        projectTitle: r.projectTitle.trim(),
        projectSummary: r.projectSummary.trim() || null,
        startDate: r.startDate || null,
        endDate: r.endDate || null,
        totalTeamSize: r.totalTeamSize.trim() || null,
        teamSize: r.teamSize.trim() || null,
        roleIds: r.roleIds,
        skillLinks: r.skillLinks,
        detail: {
          overview: r.detail.overview.trim() || null,
          researchAnalysis: r.detail.researchAnalysis,
          requirementsDefinition: r.detail.requirementsDefinition,
          basicDesign: r.detail.basicDesign,
          detailedDesign: r.detail.detailedDesign,
          development: r.detail.development,
          testing: r.detail.testing,
          operation: r.detail.operation,
        },
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
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">現場（プロジェクト）経歴</h2>
        <button type="button" className="btn-secondary" onClick={addProject} disabled={siteMasters.length === 0}>
          プロジェクトを追加
        </button>
      </div>

      {siteMasters.length === 0 && (
        <p className="text-sm text-amber-600">
          現場マスタが未登録です。管理者に現場マスタ（MST005）の登録を依頼してください。
        </p>
      )}

      {rows.map((row, idx) => (
        <section key={idx} className="card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">プロジェクト {idx + 1}</h3>
            <button type="button" className="text-red-600 hover:underline" onClick={() => removeProject(idx)}>
              このプロジェクトを削除
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">現場 *</label>
              <select
                className="form-input"
                value={row.siteId}
                onChange={(e) => updateRow(idx, { siteId: Number(e.target.value) })}
                required
              >
                {siteMasters.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.siteName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">プロジェクトタイトル *</label>
              <input
                className="form-input"
                value={row.projectTitle}
                maxLength={100}
                onChange={(e) => updateRow(idx, { projectTitle: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="form-label">開始日</label>
              <input
                type="date"
                className="form-input"
                value={row.startDate}
                onChange={(e) => updateRow(idx, { startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">終了日</label>
              <input
                type="date"
                className="form-input"
                value={row.endDate}
                onChange={(e) => updateRow(idx, { endDate: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">全体人数</label>
              <input
                className="form-input"
                value={row.totalTeamSize}
                maxLength={100}
                onChange={(e) => updateRow(idx, { totalTeamSize: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">チーム人数</label>
              <input
                className="form-input"
                value={row.teamSize}
                maxLength={100}
                onChange={(e) => updateRow(idx, { teamSize: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="form-label">プロジェクト概要</label>
            <textarea
              className="form-input"
              rows={3}
              maxLength={2000}
              value={row.projectSummary}
              onChange={(e) => updateRow(idx, { projectSummary: e.target.value })}
            />
          </div>

          <div>
            <label className="form-label">役割（複数選択可）</label>
            <div className="flex flex-wrap gap-4">
              {roleMasters.map((role) => (
                <label key={role.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.roleIds.includes(role.id)}
                    onChange={() => toggleRole(idx, role.id)}
                  />
                  {role.roleName}
                </label>
              ))}
              {roleMasters.length === 0 && <p className="text-sm text-slate-400">役割マスタが未登録です</p>}
            </div>
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
              <label className="form-label mb-0">使用スキル</label>
              <button type="button" className="text-sm text-brand-600 hover:underline" onClick={() => addSkillLink(idx)}>
                追加
              </button>
            </div>
            {row.skillLinks.map((sl, si) => (
              <div key={si} className="flex flex-wrap items-end gap-3">
                <div className="min-w-[180px]">
                  <select
                    className="form-input"
                    value={sl.skillId}
                    onChange={(e) =>
                      updateSkillLink(idx, si, { skillId: Number(e.target.value), skillVersionId: null })
                    }
                  >
                    {skillMasters.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.skillName}
                      </option>
                    ))}
                  </select>
                </div>
                {versionsFor(sl.skillId).length > 0 && (
                  <div className="min-w-[140px]">
                    <select
                      className="form-input"
                      value={sl.skillVersionId ?? ""}
                      onChange={(e) =>
                        updateSkillLink(idx, si, {
                          skillVersionId: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    >
                      <option value="">未選択</option>
                      {versionsFor(sl.skillId).map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.versionName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button
                  type="button"
                  className="text-red-600 hover:underline"
                  onClick={() => removeSkillLink(idx, si)}
                >
                  削除
                </button>
              </div>
            ))}
            {row.skillLinks.length === 0 && (
              <p className="text-sm text-slate-400">使用スキルは登録されていません</p>
            )}
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-4">
            <label className="form-label">担当工程</label>
            <div className="flex flex-wrap gap-4">
              {PROCESS_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.detail[f.key] as boolean}
                    onChange={(e) => updateDetail(idx, { [f.key]: e.target.checked } as Partial<ProjectDetailState>)}
                  />
                  {f.label}
                </label>
              ))}
            </div>
            <div>
              <label className="form-label">業務内容補足</label>
              <textarea
                className="form-input"
                rows={2}
                maxLength={300}
                value={row.detail.overview}
                onChange={(e) => updateDetail(idx, { overview: e.target.value })}
              />
            </div>
          </div>
        </section>
      ))}

      {rows.length === 0 && (
        <p className="text-sm text-slate-400">登録されている現場経歴はありません</p>
      )}

      <ErrorList errors={errors} />
      <FormActions submitting={submitting} onCancel={() => router.push(redirectTo)} />
    </form>
  );
}
