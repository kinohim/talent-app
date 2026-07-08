import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { AUTH_ERROR_NOT_REGISTERED, resolveLoginUser } from "@/lib/auth-user";
import { resolveDepartmentLevelId } from "@/lib/authz";

/**
 * 認証設定（詳細設計書1章・ADR 0009）。
 * - 設計上の認証方式はAzure AD（Microsoft Entra ID）リダイレクトログイン（AUTH001）だが、
 *   テナント準備までの暫定として「開発用ログイン」（メールアドレスまたは社員IDのみ・パスワードなし）で代替する。
 *   アカウント突合（email→User照合・isActiveチェック）はsrc/lib/auth-user.tsに分離済みで、
 *   Entra IDプロバイダへの差し替え時はそのまま再利用する
 * - セッションはJWT戦略（DBセッションテーブルは持たない）
 * - セッションにはemployeeId / role / departmentId / resolvedDepartmentId（部署レベル解決済み組織ID）を載せる
 * - 無効化（isActive = false）の即時反映はAPI側の毎リクエストDBチェック（src/lib/api-auth.ts）で行う
 */
export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "dev-login",
      name: "開発用ログイン",
      credentials: {
        identifier: { label: "メールアドレスまたは社員ID", type: "text" },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier?.trim();
        if (!identifier) {
          throw new Error(AUTH_ERROR_NOT_REGISTERED);
        }

        // 未登録・無効化済みはメッセージ付きでthrowされ、ログイン画面に表示する
        const user = await resolveLoginUser(identifier);

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        // 部署レベル解決（deptOf）はログイン時に行い、毎リクエストのツリー探索を避ける
        // （所属変更は次回ログインから反映の割り切り。detailed-design.md 1章）
        const resolvedDepartmentId = await resolveDepartmentLevelId(
          user.employee.departmentId
        );

        return {
          id: String(user.id),
          employeeId: user.employeeId,
          role: user.role,
          departmentId: user.employee.departmentId,
          resolvedDepartmentId,
          name: user.employee.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.employeeId = user.employeeId;
        token.role = user.role;
        token.departmentId = user.departmentId;
        token.resolvedDepartmentId = user.resolvedDepartmentId;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        employeeId: token.employeeId,
        role: token.role,
        departmentId: token.departmentId,
        resolvedDepartmentId: token.resolvedDepartmentId,
        name: token.name,
      };
      return session;
    },
  },
};
