"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

/**
 * 開発用ログインフォーム（ADR 0009の暫定方式）。
 * メールアドレスまたは社員IDのみでログインする（パスワードの保存・照合は行わない）。
 * Azure ADテナント準備後はMicrosoft Entra IDへのリダイレクトボタンに置き換える（AUTH001）。
 */
export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("dev-login", {
      identifier,
      redirect: false,
    });

    setSubmitting(false);

    if (result?.error) {
      // authorizeがthrowしたメッセージ（「アカウントが登録されていません」等）をそのまま表示する
      setError(
        result.error === "CredentialsSignin"
          ? "アカウントが登録されていません"
          : result.error
      );
      return;
    }

    // next-authがログインCookieを発行した直後はNextのRouter Cacheが未認証時のRSC
    // レスポンスを保持しており、router.push/refreshだと初回クリックで遷移が反映されない
    // ことがあるため、確実にサーバーへ再取得させるハードナビゲーションで遷移する。
    window.location.href = "/";
  }

  return (
    <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4">
      <p className="text-left text-xs text-slate-500">
        開発用ログイン: 登録済みのメールアドレスまたは社員IDを入力してください（パスワード不要）
      </p>
      <div>
        <label className="form-label" htmlFor="identifier">
          メールアドレスまたは社員ID
        </label>
        <input
          id="identifier"
          className="form-input"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="taro.kanri@example.com / 000001"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={submitting}>
        {submitting ? "ログイン中…" : "ログイン"}
      </button>
    </form>
  );
}
