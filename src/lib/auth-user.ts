import { prisma } from "@/lib/prisma";

/**
 * ログインアカウント突合ロジック（ADR 0009）。
 * Auth.jsのプロバイダ実装から独立させ、将来Microsoft Entra IDプロバイダへ差し替える際は
 * コールバックでAzure ADが返すメールアドレスを`resolveLoginUser`に渡すだけで再利用できる構造にする。
 * エラーメッセージはdocs/design/detailed-design.md 1章の文言に一致させる。
 */

export const AUTH_ERROR_NOT_REGISTERED = "アカウントが登録されていません";
export const AUTH_ERROR_INACTIVE = "このアカウントは無効化されています";

/**
 * 識別子からログイン対象のUserを突合する。
 * - Entra ID統合後: identifierはAzure ADが返すメールアドレス（`User.email`と照合）
 * - 開発用ログイン（暫定）: メールアドレスまたは社員IDを許容する
 * 該当なし・削除済み → AUTH_ERROR_NOT_REGISTERED、`isActive = false` → AUTH_ERROR_INACTIVE をthrowする。
 */
export async function resolveLoginUser(identifier: string) {
  const value = identifier.trim();
  if (!value) {
    throw new Error(AUTH_ERROR_NOT_REGISTERED);
  }

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [{ email: value }, { employeeId: value }],
    },
    include: { employee: true },
  });

  if (!user || !user.employee || user.employee.deletedAt) {
    throw new Error(AUTH_ERROR_NOT_REGISTERED);
  }
  if (!user.isActive) {
    throw new Error(AUTH_ERROR_INACTIVE);
  }

  return user;
}
