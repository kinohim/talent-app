import { z } from "zod";
import { katakanaOnly } from "@/lib/validation/employee";

/**
 * アカウント管理（REF007/EDT006/EDT007）のバリデーション。
 * ADR 0009: EDT006はUser（employeeId, email, role）＋Employee（name, nameKana, departmentId）の
 * 最小項目を同一トランザクションで作成する。社員IDは6桁ゼロ埋めの手動入力（重複チェックはAPI側）。
 */

const employeeIdSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "社員IDは6桁の数字（ゼロ埋め）で入力してください");

export const roleSchema = z.enum(["GENERAL", "MANAGER", "HR_SALES", "ADMIN"]);

/** EDT006 新規アカウント登録 */
export const accountCreateSchema = z.object({
  employeeId: employeeIdSchema,
  name: z.string().trim().min(1, "氏名は必須です").max(50),
  nameKana: z
    .string()
    .trim()
    .min(1, "カナは必須です")
    .max(50)
    .regex(katakanaOnly, "カナはカタカナで入力してください"),
  email: z.string().trim().min(1, "メールアドレスは必須です").email("メールアドレスの形式が正しくありません").max(255),
  departmentId: z.number().int().positive().nullable().optional(),
  role: roleSchema,
});

/** EDT007 アカウント編集: 所属部署・権限の変更、退職・無効化（isActive）処理 */
export const accountUpdateSchema = z.object({
  departmentId: z.number().int().positive().nullable().optional(),
  role: roleSchema.optional(),
  isActive: z.boolean().optional(),
});

export type AccountCreateInput = z.infer<typeof accountCreateSchema>;
export type AccountUpdateInput = z.infer<typeof accountUpdateSchema>;
