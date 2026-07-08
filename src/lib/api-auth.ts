import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * API共通の認証ヘルパー（ADR 0009: アカウント無効化の即時反映）。
 * セッション取得に加えて、毎リクエストUser.isActiveをDB確認し、
 * 無効化・削除済みアカウントはnullを返す（呼び出し側で401を返す）。
 * 全APIハンドラはgetServerSessionを直接使わず、この関数を経由すること。
 */
export async function getApiSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { employeeId: session.user.employeeId },
    select: { isActive: true, deletedAt: true },
  });
  if (!user || !user.isActive || user.deletedAt) return null;

  return session;
}
