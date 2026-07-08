import { NextResponse } from "next/server";
import type { ZodError } from "zod";

/**
 * docs/design/api-design.md 「共通方針」「エラーレスポンス形式」に準拠したヘルパー。
 */

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

export function apiError(
  code: ApiErrorCode,
  message: string,
  details?: { field: string; message: string }[]
) {
  return NextResponse.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status: STATUS_BY_CODE[code] }
  );
}

export function apiValidationError(error: ZodError) {
  const details = error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
  return apiError("VALIDATION_ERROR", "入力内容に誤りがあります", details);
}

export function apiUnauthenticated() {
  return apiError("UNAUTHENTICATED", "ログインが必要です");
}

export function apiForbidden(message = "この操作を行う権限がありません") {
  return apiError("FORBIDDEN", message);
}

export function apiNotFound(message = "対象データが見つかりません") {
  return apiError("NOT_FOUND", message);
}

export function apiConflict(message = "登録済みのデータと重複しています") {
  return apiError("CONFLICT", message);
}

export function apiInternalError(message = "サーバーエラーが発生しました") {
  return apiError("INTERNAL_ERROR", message);
}

/**
 * フェーズ2機能（requirements.md 4章）の骨組みAPI用スタブ。
 * ルーティング・型は用意するが、業務ロジックは未実装であることを明示する。
 */
export function apiPhaseTwoStub(feature: string) {
  return NextResponse.json(
    {
      error: {
        code: "NOT_IMPLEMENTED",
        message: `${feature}はフェーズ2で実装予定の機能です（未実装）`,
      },
    },
    { status: 501 }
  );
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSizeRaw = Number(searchParams.get("pageSize") ?? "20") || 20;
  const pageSize = Math.min(100, Math.max(1, pageSizeRaw));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
