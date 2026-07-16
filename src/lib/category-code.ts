import { prisma } from "@/lib/prisma";

/**
 * カテゴリコードの自動採番（MST001/002: ユーザーには入力させず、種別ごとの連番で発行し画面には表示しない）。
 * codeはDB全体でユニークなため、論理削除済みの行も含めて既存の最大連番を求める
 * （department-tree.tsのgenerateDepartmentCodeと同方針）。
 */
function nextCode(prefix: string, existingCodes: string[]): string {
  const pattern = new RegExp(`^${prefix}(\\d+)$`);
  const maxSeq = existingCodes.reduce((max, code) => {
    const match = code.match(pattern);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}${String(maxSeq + 1).padStart(2, "0")}`;
}

export async function generateSkillCategoryCode(): Promise<string> {
  const existing = await prisma.skillCategory.findMany({
    where: { code: { startsWith: "SKC" } },
    select: { code: true },
  });
  return nextCode(
    "SKC",
    existing.map((e) => e.code)
  );
}

export async function generateCertificationCategoryCode(): Promise<string> {
  const existing = await prisma.certificationCategory.findMany({
    where: { code: { startsWith: "CTC" } },
    select: { code: true },
  });
  return nextCode(
    "CTC",
    existing.map((e) => e.code)
  );
}
