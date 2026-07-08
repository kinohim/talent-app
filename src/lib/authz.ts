import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";

/**
 * 権限判定ロジック。docs/design/detailed-design.md 2.2の疑似コードが元（ADR 0008で4ロール化）。
 * API側（サーバー）での最終判定に必ずこのモジュールを使う。middleware.tsでの
 * チェックはUX目的の一次チェックに過ぎず、ここが最終防衛ライン。
 */

type EmployeeTarget = {
  employeeId: string;
  departmentId: number | null;
};

/**
 * 部署レベル解決（data-model.md「権限判定ロジック」のdeptOf）。
 * 所属組織から祖先方向にたどり、最初に見つかる orgLevel = DEPARTMENT の組織IDを返す。
 * 未設定・事業部直属・削除済み組織など解決できない場合はnull（安全側: 閲覧・編集の対象外になる）。
 */
export async function resolveDepartmentLevelId(
  departmentId: number | null
): Promise<number | null> {
  let currentId = departmentId;
  const visited = new Set<number>();

  while (currentId !== null) {
    if (visited.has(currentId)) return null; // 循環データへの安全ガード
    visited.add(currentId);

    const dept = await prisma.department.findUnique({
      where: { id: currentId },
      select: { orgLevel: true, parentId: true, deletedAt: true },
    });
    if (!dept || dept.deletedAt) return null;
    if (dept.orgLevel === "DEPARTMENT") return currentId;
    currentId = dept.parentId;
  }

  return null;
}

/**
 * 経歴書詳細の閲覧可否（ADR 0008）。
 * 本人=可、MANAGER/HR_SALES/ADMIN=全社可、GENERAL=部署レベル一致のみ可。
 */
export async function canViewEmployee(
  session: Session,
  target: EmployeeTarget
): Promise<boolean> {
  if (session.user.employeeId === target.employeeId) return true;
  if (session.user.role !== "GENERAL") return true;

  const targetDept = await resolveDepartmentLevelId(target.departmentId);
  return (
    session.user.resolvedDepartmentId !== null &&
    session.user.resolvedDepartmentId === targetDept
  );
}

/**
 * 経歴書の編集可否（ADR 0002 / 0008）。
 * 本人=可、ADMIN=全社可、MANAGER=部署レベル一致のみ可、HR_SALES/GENERAL=他人不可。
 */
export async function canEditEmployee(
  session: Session,
  target: EmployeeTarget
): Promise<boolean> {
  if (session.user.role === "ADMIN") return true;
  if (session.user.employeeId === target.employeeId) return true;
  if (session.user.role === "MANAGER") {
    const targetDept = await resolveDepartmentLevelId(target.departmentId);
    return (
      session.user.resolvedDepartmentId !== null &&
      session.user.resolvedDepartmentId === targetDept
    );
  }
  // GENERAL / HR_SALES は本人以外編集不可
  return false;
}

export function canEditDepartmentField(session: Session): boolean {
  // 所属組織（departmentId）はADMINのみ編集可（detailed-design.md 3章 EDT001）
  return session.user.role === "ADMIN";
}

export function requireAdmin(session: Session | null): session is Session {
  return session?.user.role === "ADMIN";
}

export function requireLoggedIn(session: Session | null): session is Session {
  return session !== null;
}
