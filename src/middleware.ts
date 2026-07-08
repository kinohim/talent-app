import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

/**
 * 詳細設計書 2.1: 一次チェック（UX目的）。
 * - 未ログイン → /loginへリダイレクト
 * - /admin配下はADMIN以外を弾く
 * 最終的な可否判定は必ずAPIハンドラ側（src/lib/authz.ts）で行う。
 */
export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdminPath = req.nextUrl.pathname.startsWith("/admin");

    if (isAdminPath && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: ["/", "/resumes/:path*", "/mypage/:path*", "/admin/:path*"],
};
