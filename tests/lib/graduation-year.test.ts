import { describe, expect, it } from "vitest";
import { expectedUniversityGraduationYear } from "@/lib/graduation-year";

/**
 * src/lib/graduation-year.ts の卒業見込み年度算出ロジックのユニットテスト。
 * EDT001: 生年月日から4年制大学卒業見込み年度(満22歳になる年度)を概算し、
 * 卒業年月(3月)・入社年月日(4月)のデフォルト値に使う。早生まれ(1〜3月・4/1生まれ)は前年度扱い。
 */
describe("expectedUniversityGraduationYear", () => {
  it("4月2日生まれはその年を学年基準にする", () => {
    expect(expectedUniversityGraduationYear("2000-04-02")).toBe(2022);
  });

  it("4月1日生まれは早生まれとして前年度扱いにする", () => {
    expect(expectedUniversityGraduationYear("2000-04-01")).toBe(2021);
  });

  it("1〜3月生まれは早生まれとして前年度扱いにする", () => {
    expect(expectedUniversityGraduationYear("2000-01-15")).toBe(2021);
  });

  it("不正な日付にはnullを返す", () => {
    expect(expectedUniversityGraduationYear("not-a-date")).toBeNull();
  });
});
