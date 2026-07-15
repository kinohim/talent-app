"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorList, FormActions, patchEmployeeSection } from "./patch-section";

/**
 * EDT001 基本情報登録（/resumes/[employeeId]/edit/basic）。
 * 本人編集・他社員編集（MANAGER/ADMIN）で共通のフォーム（screens.md「実装上の提案」）。
 * 所属組織欄はADMINのみ編集可（canEditDepartmentフラグで出し分け、detailed-design.md EDT001）。
 * EDT002（経歴概要・自己PR）の入力もこの画面に統合し、basic/summary両セクションを
 * 1回のPATCHでまとめて送信する。
 */

type DateLike = string | Date | null;

type InitialData = {
  employeeId: string;
  name: string;
  nameKana: string;
  birthDate: DateLike;
  gender: string | null;
  departmentId: number | null;
  departmentName: string | null;
  nearestStationId: number | null;
  experienceYears: number | null;
  finalSchoolName: string | null;
  finalDepartmentName: string | null;
  finalSchoolType: string | null;
  graduationYearMonth: DateLike;
  graduationStatus: string | null;
  careerSummary: string | null;
  selfPr: string | null;
};

type Props = {
  initialData: InitialData;
  canEditDepartment: boolean;
  departments: { id: number; label: string }[];
  stations: { id: number; stationName: string }[];
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
  stations,
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
  const [experienceYears, setExperienceYears] = useState(
    initialData.experienceYears !== null ? String(initialData.experienceYears) : ""
  );
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
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors([]);

    const basic = {
      name: name.trim(),
      nameKana: nameKana.trim(),
      birthDate: birthDate || null,
      gender: gender || null,
      // 所属組織はADMINのみ送信（他ロールが送ってもサーバー側で無視される）
      ...(canEditDepartment ? { departmentId: departmentId ? Number(departmentId) : null } : {}),
      nearestStationId: nearestStationId ? Number(nearestStationId) : null,
      experienceYears: experienceYears ? Number(experienceYears) : null,
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

    const result = await patchEmployeeSection(initialData.employeeId, { basic, summary });
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
            <select
              className="form-input"
              value={nearestStationId}
              onChange={(e) => setNearestStationId(e.target.value)}
            >
              <option value="">未設定</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.stationName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">経験年数</label>
            <input
              type="number"
              min={0}
              max={100}
              className="form-input"
              value={experienceYears}
              onChange={(e) => setExperienceYears(e.target.value)}
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

      <ErrorList errors={errors} />
      <FormActions submitting={submitting} onCancel={() => router.push(redirectTo)} />
    </form>
  );
}
