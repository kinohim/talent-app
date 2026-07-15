import { z } from "zod";

/**
 * 経歴書更新（PATCH /api/employees/[employeeId]）のバリデーション。
 * docs/design/api-design.md 2.2「セクション部分更新」:
 * リクエストボディは basic（EDT001）／summary（EDT002）／skills（EDT003）／
 * certifications（EDT004）／projects（EDT005）のいずれかのセクションキーのみを含み、
 * 未指定のセクションは変更しない。
 *
 * 氏名・カナの文字数上限は db-design.md の物理カラム幅（VARCHAR(50)）を優先する
 * （detailed-design.mdは「100文字以内」表記だが、DB制約を超えると保存できないため。
 *  ドキュメント間の不整合はdesign-review-agent/ユーザーへの報告事項）。
 */

export const katakanaOnly = /^[ァ-ヶー\s]*$/;
const yearMonth = /^\d{4}-(0[1-9]|1[0-2])$/;

/** EDT001 基本情報（氏名・カナ・生年月日・性別・所属組織・最寄駅・経験年数・最終学歴） */
export const basicSectionSchema = z.object({
  name: z.string().trim().min(1, "氏名は必須です").max(50),
  nameKana: z
    .string()
    .trim()
    .min(1, "カナは必須です")
    .max(50)
    .regex(katakanaOnly, "カナはカタカナで入力してください"),
  birthDate: z
    .string()
    .date()
    .nullable()
    .optional()
    .refine((v) => !v || v <= new Date().toISOString().slice(0, 10), {
      message: "生年月日に未来日は指定できません",
    }),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  // departmentIdはADMINのみ変更可。他ロールが送ってもAPI側で無視する（api-design.md 2.2）。
  departmentId: z.number().int().positive().nullable().optional(),
  nearestStationId: z.number().int().positive().nullable().optional(),
  hireDate: z
    .string()
    .date()
    .nullable()
    .optional()
    .refine((v) => !v || v <= new Date().toISOString().slice(0, 10), {
      message: "入社年月日に未来日は指定できません",
    }),
  finalSchoolName: z.string().max(100).nullable().optional(),
  finalDepartmentName: z.string().max(100).nullable().optional(),
  finalSchoolType: z
    .enum(["HIGH_SCHOOL", "VOCATIONAL", "JUNIOR_COLLEGE", "UNIVERSITY", "GRAD_SCHOOL"])
    .nullable()
    .optional(),
  graduationYearMonth: z
    .string()
    .regex(yearMonth, "卒業年月はYYYY-MM形式で入力してください")
    .nullable()
    .optional(),
  graduationStatus: z.enum(["GRADUATED", "WITHDREW"]).nullable().optional(),
});

/** EDT002 経歴概要・自己PR */
export const summarySectionSchema = z.object({
  careerSummary: z.string().max(2000, "経歴概要は2000文字以内で入力してください").nullable().optional(),
  selfPr: z.string().max(2000, "自己PRは2000文字以内で入力してください").nullable().optional(),
});

/** EDT003 スキル */
const skillLinkSchema = z.object({
  skillId: z.number().int().positive(),
  skillVersionId: z.number().int().positive().nullable().optional(),
  skillLevel: z.enum(["LOW", "MID", "HIGH"]).nullable().optional(),
});

export const skillsSectionSchema = z.array(skillLinkSchema).superRefine((rows, ctx) => {
  // 同一skillId+skillVersionIdの重複禁止（一意制約と一致、detailed-design.md EDT003）
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const key = `${row.skillId}:${row.skillVersionId ?? "null"}`;
    if (seen.has(key)) {
      ctx.addIssue({
        code: "custom",
        message: "同じスキル・バージョンの組み合わせが重複しています",
        path: [index, "skillId"],
      });
    }
    seen.add(key);
  });
});

/** EDT004 資格 */
const certificationLinkSchema = z
  .object({
    certificationId: z.number().int().positive(),
    acquiredDate: z.string().date().nullable().optional(),
    expirationDate: z.string().date().nullable().optional(),
  })
  .refine(
    (v) => !v.acquiredDate || !v.expirationDate || v.acquiredDate <= v.expirationDate,
    { message: "取得年月日は有効期限日以前にしてください", path: ["expirationDate"] }
  );

export const certificationsSectionSchema = z.array(certificationLinkSchema);

/** EDT005 プロジェクト経歴（編集UIはフェーズ2/Stage 3。APIのセクション受け口のみ用意） */
const projectDetailSchema = z.object({
  overview: z.string().max(300).nullable().optional(),
  researchAnalysis: z.boolean().nullable().optional(),
  requirementsDefinition: z.boolean().nullable().optional(),
  basicDesign: z.boolean().nullable().optional(),
  detailedDesign: z.boolean().nullable().optional(),
  development: z.boolean().nullable().optional(),
  testing: z.boolean().nullable().optional(),
  operation: z.boolean().nullable().optional(),
});

const projectSchema = z
  .object({
    id: z.number().int().positive().optional(),
    // 現場は自由記述からSiteマスタ参照に変更（ADR 0007、EDT005）
    siteId: z.number().int().positive("現場を選択してください"),
    projectTitle: z.string().trim().min(1, "プロジェクトタイトルは必須です").max(100),
    projectSummary: z.string().max(2000).nullable().optional(),
    startDate: z.string().date().nullable().optional(),
    endDate: z.string().date().nullable().optional(),
    totalTeamSize: z.string().max(100).nullable().optional(),
    teamSize: z.string().max(100).nullable().optional(),
    roleIds: z.array(z.number().int().positive()).default([]),
    skillLinks: z
      .array(
        z.object({
          skillId: z.number().int().positive(),
          skillVersionId: z.number().int().positive().nullable().optional(),
        })
      )
      .default([]),
    detail: projectDetailSchema.nullable().optional(),
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    message: "開始日は終了日以前にしてください",
    path: ["endDate"],
  });

export const projectsSectionSchema = z.array(projectSchema);

export const employeeUpdateSchema = z
  .object({
    basic: basicSectionSchema.optional(),
    summary: summarySectionSchema.optional(),
    skills: skillsSectionSchema.optional(),
    certifications: certificationsSectionSchema.optional(),
    projects: projectsSectionSchema.optional(),
  })
  .refine(
    (v) =>
      v.basic !== undefined ||
      v.summary !== undefined ||
      v.skills !== undefined ||
      v.certifications !== undefined ||
      v.projects !== undefined,
    { message: "更新対象のセクションが指定されていません" }
  );

export type EmployeeUpdateInput = z.infer<typeof employeeUpdateSchema>;
export type BasicSectionInput = z.infer<typeof basicSectionSchema>;
export type SummarySectionInput = z.infer<typeof summarySectionSchema>;
