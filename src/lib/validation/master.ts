import { z } from "zod";

/**
 * マスタ管理（AdminMasterTable）共通のバリデーション。
 * docs/design/detailed-design.md 3章「S-14/S-15/S-18共通仕様」に基づく。
 */

/** 組織マスタ（MST004）。事業部＞部署＞Grの3階層（ADR 0007）。組織コードはユーザー入力させず自動採番する。 */
export const departmentSchema = z
  .object({
    departmentName: z.string().trim().min(1, "組織名は必須です").max(100),
    orgLevel: z.enum(["DIVISION", "DEPARTMENT", "GROUP"]),
    parentId: z.number().int().positive().nullable().optional(),
  })
  .refine((v) => (v.orgLevel === "DIVISION" ? !v.parentId : !!v.parentId), {
    message: "事業部は親組織なし、部署・Grは親組織の指定が必要です",
    path: ["parentId"],
  });

// カテゴリコード(code)はMST001で自動採番し画面には表示しないため、クライアント入力の対象外(2026-07確定)
export const skillCategorySchema = z.object({
  categoryName: z.string().trim().min(1, "カテゴリ名は必須です").max(100),
});

export const skillSchema = z.object({
  categoryId: z.number().int().positive("カテゴリを選択してください"),
  skillName: z.string().trim().min(1, "スキル名は必須です").max(100),
  // バージョンは複数タグ入力（screens.md MST001）。SkillVersionとして保存し、
  // hasVersionはversionsの有無からAPI側で自動設定する。
  versions: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
});

export const skillVersionSchema = z.object({
  skillId: z.number().int().positive(),
  versionName: z.string().trim().min(1, "バージョン名は必須です").max(100),
  versionOrder: z.number().int().nullable().optional(),
  releaseDate: z.string().date().nullable().optional(),
  isActive: z.boolean().default(true),
});

// カテゴリコード(code)はMST002で自動採番し画面には表示しないため、クライアント入力の対象外(2026-07確定)
export const certificationCategorySchema = z.object({
  categoryName: z.string().trim().min(1, "カテゴリ名は必須です").max(100),
  description: z.string().max(255).nullable().optional(),
});

export const certificationSchema = z.object({
  categoryId: z.number().int().positive("カテゴリを選択してください"),
  certificationName: z.string().trim().min(1, "資格名は必須です").max(100),
  certificationOrganization: z.string().max(100).nullable().optional(),
});

export const siteSchema = z.object({
  siteName: z.string().trim().min(1, "現場名は必須です").max(100),
  nearestStationLine: z.string().trim().max(100).nullable().optional(),
  nearestStationName: z.string().trim().max(100).nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
});

/** 現場ポジション（役割）マスタ（MST003）。名称のみの単純マスタ（detailed-design.md 3章）。 */
export const projectRoleSchema = z.object({
  roleName: z.string().trim().min(1, "役割名は必須です").max(100),
});
