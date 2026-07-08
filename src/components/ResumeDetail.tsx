import Link from "next/link";

/**
 * 経歴書詳細（REF003）の閲覧専用ビュー。他社員閲覧と本人確認（マイページから遷移）の共通画面。
 * 編集権限がある場合（editBase指定時）は各セクションにEDT001〜005への編集導線を表示する。
 * 閲覧可能な場合はPDF出力（REF005）導線を表示する。
 */

const GENDER_LABEL: Record<string, string> = { MALE: "男性", FEMALE: "女性", OTHER: "その他" };
const SCHOOL_TYPE_LABEL: Record<string, string> = {
  HIGH_SCHOOL: "高校",
  VOCATIONAL: "専門学校",
  JUNIOR_COLLEGE: "短大",
  UNIVERSITY: "大学",
  GRAD_SCHOOL: "大学院",
};
const GRADUATION_STATUS_LABEL: Record<string, string> = { GRADUATED: "卒業", WITHDREW: "中退" };
const SKILL_LEVEL_LABEL: Record<string, string> = { LOW: "△", MID: "〇", HIGH: "◎" };

function fmtDate(value: string | Date | null) {
  if (!value) return "-";
  const iso = value instanceof Date ? value.toISOString() : value;
  return iso.slice(0, 10);
}

function fmtYearMonth(value: string | Date | null) {
  const formatted = fmtDate(value);
  return formatted === "-" ? "-" : formatted.slice(0, 7);
}

type Employee = {
  employeeId: string;
  name: string;
  nameKana: string;
  birthDate: string | Date | null;
  gender: string | null;
  departmentName: string | null;
  nearestStationName: string | null;
  experienceYears: number | null;
  careerSummary: string | null;
  selfPr: string | null;
  finalSchoolName: string | null;
  finalDepartmentName: string | null;
  finalSchoolType: string | null;
  graduationYearMonth: string | Date | null;
  graduationStatus: string | null;
  deletedAt: string | Date | null;
  skills: { skillId: number; skillName: string; skillVersionName: string | null; skillLevel: string | null }[];
  certifications: {
    id: number;
    certificationName: string;
    categoryName: string;
    acquiredDate: string | Date | null;
    expirationDate: string | Date | null;
  }[];
  projects: {
    id: number;
    siteName: string;
    projectTitle: string;
    startDate: string | Date | null;
    endDate: string | Date | null;
    roles: { roleName: string }[];
  }[];
};

function SectionHeader({ title, editHref }: { title: string; editHref: string | null }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-semibold">{title}</h2>
      {editHref && (
        <Link href={editHref} className="text-sm text-brand-600 hover:underline">
          編集
        </Link>
      )}
    </div>
  );
}

export function ResumeDetail({
  employee,
  editBase,
  showPdfLink = true,
}: {
  employee: Employee;
  /** 編集権限がある場合の編集画面のベースパス（例: /resumes/000001/edit）。無ければnull */
  editBase: string | null;
  /** PDF出力（REF005）導線の表示有無。プレビュー画面自身での二重表示を避けるためfalseにできる */
  showPdfLink?: boolean;
}) {
  const editHref = (section: string) => (editBase ? `${editBase}/${section}` : null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {employee.name}（{employee.nameKana}）
            {employee.deletedAt && <span className="ml-2 text-sm text-red-500">(削除済み)</span>}
          </h1>
          <p className="text-sm text-slate-500">社員ID: {employee.employeeId}</p>
        </div>
        {showPdfLink && (
          <Link href={`/resumes/${employee.employeeId}/preview`} className="btn-secondary">
            PDF出力
          </Link>
        )}
      </div>

      <section className="card space-y-4">
        <SectionHeader title="基本情報" editHref={editHref("basic")} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="生年月日" value={fmtDate(employee.birthDate)} />
          <Field label="性別" value={employee.gender ? GENDER_LABEL[employee.gender] : "-"} />
          <Field label="所属組織" value={employee.departmentName ?? "未設定"} />
          <Field label="最寄り駅" value={employee.nearestStationName ?? "未設定"} />
          <Field
            label="経験年数"
            value={employee.experienceYears !== null ? `${employee.experienceYears}年` : "-"}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <Field label="最終学歴" value={employee.finalSchoolName ?? "-"} />
          <Field label="学部・学科" value={employee.finalDepartmentName ?? "-"} />
          <Field
            label="学校区分"
            value={employee.finalSchoolType ? SCHOOL_TYPE_LABEL[employee.finalSchoolType] : "-"}
          />
          <Field label="卒業年月" value={fmtYearMonth(employee.graduationYearMonth)} />
          <Field
            label="卒業状況"
            value={employee.graduationStatus ? GRADUATION_STATUS_LABEL[employee.graduationStatus] : "-"}
          />
        </div>
      </section>

      <section className="card space-y-2">
        <SectionHeader title="経歴概要・自己PR" editHref={editHref("summary")} />
        <div>
          <p className="text-xs text-slate-500">経歴概要</p>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{employee.careerSummary || "-"}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">自己PR</p>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{employee.selfPr || "-"}</p>
        </div>
      </section>

      <section className="card space-y-2">
        <SectionHeader title="保有スキル" editHref={editHref("skills")} />
        {employee.skills.length === 0 ? (
          <p className="text-sm text-slate-400">登録されているスキルはありません</p>
        ) : (
          <ul className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
            {employee.skills.map((s, i) => (
              <li key={i}>
                {s.skillName}
                {s.skillVersionName ? ` (${s.skillVersionName})` : ""} —{" "}
                {s.skillLevel ? SKILL_LEVEL_LABEL[s.skillLevel] : "-"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-2">
        <SectionHeader title="保有資格" editHref={editHref("certifications")} />
        {employee.certifications.length === 0 ? (
          <p className="text-sm text-slate-400">登録されている資格はありません</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {employee.certifications.map((c) => (
              <li key={c.id}>
                {c.categoryName} / {c.certificationName}（取得: {fmtDate(c.acquiredDate)} / 有効期限:{" "}
                {fmtDate(c.expirationDate)}）
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card space-y-2">
        <SectionHeader title="現場（プロジェクト）経歴" editHref={editHref("projects")} />
        {employee.projects.length === 0 ? (
          <p className="text-sm text-slate-400">登録されている現場経歴はありません</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {employee.projects.map((p) => (
              <li key={p.id} className="border-b border-slate-100 pb-2">
                <p className="font-medium">
                  {p.siteName} — {p.projectTitle}
                </p>
                <p className="text-slate-500">
                  {fmtDate(p.startDate)} 〜 {fmtDate(p.endDate)} /{" "}
                  {p.roles.map((r) => r.roleName).join("、") || "役割未設定"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
