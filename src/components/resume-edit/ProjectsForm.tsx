"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorList, FormActions, TopSaveButton, patchEmployeeSection } from "./patch-section";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

/**
 * EDT005 プロジェクト経歴登録（/resumes/[employeeId]/edit/projects[/[projectId]]）。
 * REF006の一覧で選択した1件のみを編集する画面（他のプロジェクトは表示しない）。
 * PATCH /api/employees/[employeeId] の projects セクションは全件置き換え方式のため、
 * 選択中の1件以外（otherProjects）はそのまま payload に含めて送り直し、他の経歴を消さないようにする。
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

export type InitialProject = {
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

function rowToPayload(r: ProjectRow) {
  return {
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
  };
}

function initialToPayload(p: InitialProject) {
  return {
    siteId: p.siteId,
    projectTitle: p.projectTitle,
    projectSummary: p.projectSummary,
    startDate: p.startDate ? toDateInputValue(p.startDate) : null,
    endDate: p.endDate ? toDateInputValue(p.endDate) : null,
    totalTeamSize: p.totalTeamSize,
    teamSize: p.teamSize,
    roleIds: p.roles.map((r) => r.projectRoleId),
    skillLinks: p.skills.map((s) => ({ skillId: s.skillId, skillVersionId: s.skillVersionId })),
    detail: p.detail
      ? {
          overview: p.detail.overview,
          researchAnalysis: p.detail.researchAnalysis,
          requirementsDefinition: p.detail.requirementsDefinition,
          basicDesign: p.detail.basicDesign,
          detailedDesign: p.detail.detailedDesign,
          development: p.detail.development,
          testing: p.detail.testing,
          operation: p.detail.operation,
        }
      : {
          overview: null,
          researchAnalysis: null,
          requirementsDefinition: null,
          basicDesign: null,
          detailedDesign: null,
          development: null,
          testing: null,
          operation: null,
        },
  };
}

export function ProjectsForm({
  employeeId,
  initialProject,
  otherProjects,
  siteMasters,
  roleMasters,
  skillMasters,
  redirectTo,
}: {
  employeeId: string;
  /** 編集対象の1件。新規追加の場合はnull */
  initialProject: InitialProject | null;
  /** 編集対象以外の既存プロジェクト。全件置き換えAPIに送り直すためだけに使う(表示・編集はしない) */
  otherProjects: InitialProject[];
  siteMasters: SiteMaster[];
  roleMasters: RoleMaster[];
  skillMasters: SkillMaster[];
  redirectTo: string;
}) {
  const router = useRouter();
  const [row, setRow] = useState<ProjectRow>(initialProject ? toRow(initialProject) : newRow(siteMasters));
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function updateRow(patch: Partial<ProjectRow>) {
    setRow((prev) => ({ ...prev, ...patch }));
  }

  function updateDetail(patch: Partial<ProjectDetailState>) {
    setRow((prev) => ({ ...prev, detail: { ...prev.detail, ...patch } }));
  }

  function toggleRole(roleId: number) {
    setRow((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
    }));
  }

  function addSkillLink() {
    if (skillMasters.length === 0) return;
    setRow((prev) => ({
      ...prev,
      skillLinks: [...prev.skillLinks, { skillId: skillMasters[0].id, skillVersionId: null }],
    }));
  }

  function updateSkillLink(skillIdx: number, patch: Partial<{ skillId: number; skillVersionId: number | null }>) {
    setRow((prev) => ({
      ...prev,
      skillLinks: prev.skillLinks.map((sl, si) => (si === skillIdx ? { ...sl, ...patch } : sl)),
    }));
  }

  function removeSkillLink(skillIdx: number) {
    setRow((prev) => ({ ...prev, skillLinks: prev.skillLinks.filter((_, si) => si !== skillIdx) }));
  }

  function versionsFor(skillId: number) {
    return skillMasters.find((s) => s.id === skillId)?.versions ?? [];
  }

  async function save(projects: unknown[]) {
    setSubmitting(true);
    setErrors([]);
    const result = await patchEmployeeSection(employeeId, { projects });
    setSubmitting(false);

    if (result) {
      setErrors(result);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await save([...otherProjects.map(initialToPayload), rowToPayload(row)]);
  }

  async function handleDelete() {
    setConfirmingDelete(false);
    await save(otherProjects.map(initialToPayload));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <TopSaveButton submitting={submitting} />

      {siteMasters.length === 0 && (
        <p className="text-sm text-amber-600">
          現場マスタが未登録です。管理者に現場マスタ（MST005）の登録を依頼してください。
        </p>
      )}

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{initialProject ? "プロジェクトを編集" : "プロジェクトを追加"}</h3>
          {initialProject && (
            <button
              type="button"
              className="text-red-600 hover:underline"
              onClick={() => setConfirmingDelete(true)}
            >
              このプロジェクトを削除
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">現場 *</label>
            <select
              className="form-input"
              value={row.siteId}
              onChange={(e) => updateRow({ siteId: Number(e.target.value) })}
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
              onChange={(e) => updateRow({ projectTitle: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="form-label">開始日</label>
            <input
              type="date"
              className="form-input"
              value={row.startDate}
              onChange={(e) => updateRow({ startDate: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">終了日</label>
            <input
              type="date"
              className="form-input"
              value={row.endDate}
              onChange={(e) => updateRow({ endDate: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">全体人数</label>
            <input
              className="form-input"
              value={row.totalTeamSize}
              maxLength={100}
              onChange={(e) => updateRow({ totalTeamSize: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">チーム人数</label>
            <input
              className="form-input"
              value={row.teamSize}
              maxLength={100}
              onChange={(e) => updateRow({ teamSize: e.target.value })}
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
            onChange={(e) => updateRow({ projectSummary: e.target.value })}
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
                  onChange={() => toggleRole(role.id)}
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
            <button type="button" className="text-sm text-brand-600 hover:underline" onClick={addSkillLink}>
              追加
            </button>
          </div>
          {row.skillLinks.map((sl, si) => (
            <div key={si} className="flex flex-wrap items-end gap-3">
              <div className="min-w-[180px]">
                <select
                  className="form-input"
                  value={sl.skillId}
                  onChange={(e) => updateSkillLink(si, { skillId: Number(e.target.value), skillVersionId: null })}
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
                      updateSkillLink(si, {
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
              <button type="button" className="text-red-600 hover:underline" onClick={() => removeSkillLink(si)}>
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
                  onChange={(e) => updateDetail({ [f.key]: e.target.checked } as Partial<ProjectDetailState>)}
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
              onChange={(e) => updateDetail({ overview: e.target.value })}
            />
          </div>
        </div>
      </section>

      <ErrorList errors={errors} />
      <FormActions submitting={submitting} onCancel={() => router.push(redirectTo)} />

      <ConfirmDeleteModal
        open={confirmingDelete}
        targetName={row.projectTitle || "このプロジェクト"}
        busy={submitting}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={handleDelete}
      />
    </form>
  );
}
