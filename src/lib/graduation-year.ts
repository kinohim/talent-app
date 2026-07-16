/**
 * 4年制大学を卒業する見込み年度を生年月日から概算する（EDT001: 卒業年月・入社年月日のデフォルト値用）。
 * 日本の学年は4/2〜翌年4/1生まれを同学年とするため、1〜3月・4/1生まれは前年度扱いにする（早生まれ）。
 * 大学卒業時の満年齢を22歳と仮定した概算であり、浪人・留年等は考慮しない。
 */
export function expectedUniversityGraduationYear(birthDateStr: string): number | null {
  const birth = new Date(birthDateStr);
  if (Number.isNaN(birth.getTime())) return null;
  const month = birth.getMonth(); // 0-indexed
  const day = birth.getDate();
  const isEarlyBirth = month < 3 || (month === 3 && day === 1);
  const academicYear = isEarlyBirth ? birth.getFullYear() - 1 : birth.getFullYear();
  return academicYear + 22;
}
