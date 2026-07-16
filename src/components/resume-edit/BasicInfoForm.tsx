"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorList, FormActions, TopSaveButton, patchEmployeeSection } from "./patch-section";
import { StationSearchInput } from "./StationSearchInput";
import { expectedUniversityGraduationYear } from "@/lib/graduation-year";

/**
 * EDT001〜004 基本情報・経歴概要・保有スキル・保有資格の統合編集画面（/resumes/[employeeId]/edit/basic）。
 * 本人編集・他社員編集（MANAGER/ADMIN）で共通のフォーム（screens.md「実装上の提案」）。
 * 所属組織欄はADMINのみ編集可（canEditDepartmentフラグで出し分け、detailed-design.md EDT001）。
 * basic/summary/skills/certificationsの4セクションを1回のPATCHでまとめて送信する。
 */

type DateLike = string | Date | null;

type SkillMaster = { id: number; skillName: string; versions: { id: number; versionName: string }[] };
type CertificationMaster = { id: number; certificationName: string; categoryName: string };

type SkillRow = { skillId: number; skillVersionId: number | null; skillLevel: string };
type CertRow = { certificationId: number; acquiredDate: string; expirationDate: string };

const SKILL_LEVEL_OPTIONS = [
  { value: "LOW", label: "△（基礎レベル）" },
  { value: "MID", label: "〇（実務経験あり）" },
  { value: "HIGH", label: "◎（指導・設計可能）" },
];

type InitialData = {
  employeeId: string;
  name: string;
  nameKana: string;
  birthDate: DateLike;
  gender: string | null;
  departmentId: number | null;
  departmentName: string | null;
  nearestStationId: number | null;
  nearestStationName: string | null;
  hireDate: DateLike;
  finalSchoolName: string | null;
  finalDepartmentName: string | null;
  finalSchoolType: string | null;
  graduationYearMonth: DateLike;
  graduationStatus: string | null;
  careerSummary: string | null;
  selfPr: string | null;
  skills: { skillId: number; skillVersionId: number | null; skillLevel: string | null }[];
  certifications: { certificationId: number; acquiredDate: DateLike; expirationDate: DateLike }[];
};

type Props = {
  initialData: InitialData;
  canEditDepartment: boolean;
  departments: { id: number; label: string }[];
  skillMasters: SkillMaster[];
  certificationMasters: CertificationMaster[];
  redirectTo: string;
};

const GENDER_OPTIONS = [
  { value: "MALE", label: "男性" },
  { value: "FEMALE", label: "女性" },
  { value: "OTHER", label: "その他" },
];

const SCHOOL_TYPE_OPTIONS = [
  { value: "HIGH_SCHOOL", label: "高校" },
  { value: "VOCATIONAL", label: "専門学校" },
  { value: "JUNIOR_COLLEGE", label: "短大" },
  { value: "UNIVERSITY", label: "大学" },
  { value: "GRAD_SCHOOL", label: "大学院" },
];

const GRADUATION_STATUS_OPTIONS = [
  { value: "GRADUATED", label: "卒業" },
  { value: "WITHDREW", label: "中退" },
];

function toDateInputValue(value: DateLike): string {
  if (!value) return "";
  const iso = value instanceof Date ? value.toISOString() : value;
  return iso.slice(0, 10);
}

export function BasicInfoForm({
  initialData,
  canEditDepartment,
  departments,
  skillMasters,
  certificationMasters,
  redirectTo,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialData.name);
  const [nameKana, setNameKana] = useState(initialData.nameKana);
  const [birthDate, setBirthDate] = useState(toDateInputValue(initialData.birthDate));
  const [gender, setGender] = useState(initialData.gender ?? "");
  const [departmentId, setDepartmentId] = useState(
    initialData.departmentId ? String(initialData.departmentId) : ""
  );
  const [nearestStationId, setNearestStationId] = useState(
    initialData.nearestStationId ? String(initialData.nearestStationId) : ""
  );
  const [hireDate, setHireDate] = useState(toDateInputValue(initialData.hireDate));
  const [finalSchoolName, setFinalSchoolName] = useState(initialData.finalSchoolName ?? "");
  const [finalDepartmentName, setFinalDepartmentName] = useState(
    initialData.finalDepartmentName ?? ""
  );
  const [finalSchoolType, setFinalSchoolType] = useState(initialData.finalSchoolType ?? "");
  const [graduationYearMonth, setGraduationYearMonth] = useState(
    toDateInputValue(initialData.graduationYearMonth).slice(0, 7)
  );
  const [graduationStatus, setGraduationStatus] = useState(initialData.graduationStatus ?? "");
  const [careerSummary, setCareerSummary] = useState(initialData.careerSummary ?? "");
  const [selfPr, setSelfPr] = useState(initialData.selfPr ?? "");
  const [skillRows, setSkillRows] = useState<SkillRow[]>(
    initialData.skills.map((s) => ({
      skillId: s.skillId,
      skillVersionId: s.skillVersionId,
      skillLevel: s.skillLevel ?? "MID",
    }))
  );
  const [certRows, setCertRows] = useState<CertRow[]>(
    initialData.certifications.map((c) => ({
      certificationId: c.certificationId,
      acquiredDate: toDateInputValue(c.acquiredDate),
      expirationDate: toDateInputValue(c.expirationDate),
    }))
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!birthDate) return;
    const expectedYear = expectedUniversityGraduationYear(birthDate);
    if (expectedYear === null) return;
    setGraduationYearMonth((prev) => prev || `${expectedYear}-03`);
    setHireDate((prev) => prev || `${expectedYear}-04-01`);
  }, [birthDate]);

  function skillVersionsFor(skillId: number) {
    return skillMasters.find((s) => s.id === skillId)?.versions ?? [];
  }

  function addSkillRow() {
    if (skillMasters.length === 0) return;
    setSkillRows((prev) => [...prev, { skillId: skillMasters[0].id, skillVersionId: null, skillLevel: "MID" }]);
  }

  function addCertRow() {
    if (certificationMasters.length === 0) return;
    setCertRows((prev) => [
      ...prev,
      { certificationId: certificationMasters[0].id, acquiredDate: "", expirationDate: "" },
    ]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const basic = {
      name: name.trim(),
      nameKana: nameKana.trim(),
      birthDate: birthDate || null,
      gender: gender || null,
      // 所属組織はADMINのみ送信(他ロールが送ってもサーバー側で無視される)
      ...(canEditDepartment ? { departmentId: departmentId ? Number(departmentId) : null } : {}),
      nearestStationId: nearestStationId ? Number(nearestStationId) : null,
      hireDate: hireDate || null,
      finalSchoolName: finalSchoolName.trim() || null,
      finalDepartmentName: finalDepartmentName.trim() || null,
      finalSchoolType: finalSchoolType || null,
      graduationYearMonth: graduationYearMonth || null,
      graduationStatus: graduationStatus || null,
    };
    const summary = {
      careerSummary: careerSummary.trim() || null,
      selfPr: selfPr.trim() || null,
    };
    const skills = skillRows.map((r) => ({
      skillId: r.skillId,
      skillVersionId: r.skillVersionId,
      skillLevel: r.skillLevel,
    }));
    const certifications = certRows.map((r) => ({
      certificationId: r.certificationId,
      acquiredDate: r.acquiredDate || null,
      expirationDate: r.expirationDate || null,
    }));

    const result = await patchEmployeeSection(initialData.employeeId, {
      basic,
      summary,
      skills,
      certifications,
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
      <TopSaveButton submitting={submitting} />

      <section className="card space-y-4">
        <h2 className="font-semibold">基本情報</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">氏名 *</label>
            <input
              className="form-input"
              value={name}
              maxLength={50}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">カナ *</label>
            <input
              className="form-input"
              value={nameKana}
              maxLength={50}
              onChange={(e) => setNameKana(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="form-label">生年月日</label>
            <input
              type="date"
              className="form-input"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">性別</label>
            <select className="form-input" value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">未選択</option>
              {GENDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">所属組織</label>
            {canEditDepartment ? (
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
            ) : (
              <p className="form-input bg-slate-50 text-slate-500">
                {initialData.departmentName ?? "未設定"}（管理者のみ変更可）
              </p>
            )}
          </div>
          <div>
            <label className="form-label">最寄り駅</label>
            <StationSearchInput
              initialName={initialData.nearestStationName}
              onSelect={(id) => setNearestStationId(id ? String(id) : "")}
            />
          </div>
          <div>
            <label className="form-label">入社年月日</label>
            <input
              type="date"
              className="form-input"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">最終学歴</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">学校名</label>
            <input
              className="form-input"
              value={finalSchoolName}
              maxLength={100}
              onChange={(e) => setFinalSchoolName(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">学部・学科名</label>
            <input
              className="form-input"
              value={finalDepartmentName}
              maxLength={100}
              onChange={(e) => setFinalDepartmentName(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">学校区分</label>
            <select
              className="form-input"
              value={finalSchoolType}
              onChange={(e) => setFinalSchoolType(e.target.value)}
            >
              <option value="">未選択</option>
              {SCHOOL_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">卒業年月</label>
            <input
              type="month"
              className="form-input"
              value={graduationYearMonth}
              onChange={(e) => setGraduationYearMonth(e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">卒業状況</label>
            <select
              className="form-input"
              value={graduationStatus}
              onChange={(e) => setGraduationStatus(e.target.value)}
            >
              <option value="">未選択</option>
              {GRADUATION_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">経歴概要・自己PR</h2>
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

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">保有スキル</h2>
          <button type="button" className="btn-secondary" onClick={addSkillRow}>
            追加
          </button>
        </div>
        {skillRows.map((row, idx) => (
          <div key={idx} className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-3">
            <div className="min-w-[180px]">
              <label className="form-label">スキル</label>
              <select
                className="form-input"
                value={row.skillId}
                onChange={(e) => {
                  const skillId = Number(e.target.value);
                  setSkillRows((prev) =>
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
            {skillVersionsFor(row.skillId).length > 0 && (
              <div className="min-w-[140px]">
                <label className="form-label">バージョン</label>
                <select
                  className="form-input"
                  value={row.skillVersionId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : null;
                    setSkillRows((prev) => prev.map((r, i) => (i === idx ? { ...r, skillVersionId: v } : r)));
                  }}
                >
                  <option value="">未選択</option>
                  {skillVersionsFor(row.skillId).map((v) => (
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
                  setSkillRows((prev) =>
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
              onClick={() => setSkillRows((prev) => prev.filter((_, i) => i !== idx))}
            >
              削除
            </button>
          </div>
        ))}
        {skillRows.length === 0 && <p className="text-sm text-slate-400">登録されているスキルはありません</p>}
      </section>

      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">保有資格</h2>
          <button type="button" className="btn-secondary" onClick={addCertRow}>
            追加
          </button>
        </div>
        {certRows.map((row, idx) => (
          <div key={idx} className="flex flex-wrap items-end gap-3 border-b border-slate-100 pb-3">
            <div className="min-w-[220px]">
              <label className="form-label">資格</label>
              <select
                className="form-input"
                value={row.certificationId}
                onChange={(e) => {
                  const certificationId = Number(e.target.value);
                  setCertRows((prev) => prev.map((r, i) => (i === idx ? { ...r, certificationId } : r)));
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
                  setCertRows((prev) =>
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
                  setCertRows((prev) =>
                    prev.map((r, i) => (i === idx ? { ...r, expirationDate: e.target.value } : r))
                  )
                }
              />
            </div>
            <button
              type="button"
              className="text-red-600 hover:underline"
              onClick={() => setCertRows((prev) => prev.filter((_, i) => i !== idx))}
            >
              削除
            </button>
          </div>
        ))}
        {certRows.length === 0 && <p className="text-sm text-slate-400">登録されている資格はありません</p>}
      </section>

      <ErrorList errors={errors} />
      <FormActions submitting={submitting} onCancel={() => router.push(redirectTo)} />
    </form>
  );
}
