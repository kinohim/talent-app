"use client";

/**
 * CMN001 削除確認モーダル（全画面共通コンポーネント）。
 * docs/design/detailed-design.md 3章: 対象の名称と確認文言、キャンセル／削除ボタンを表示。
 * 削除ボタンは誤操作防止のため危険色（赤系）。実行後の一覧再取得は呼び出し側のonConfirmで行う。
 */
export function ConfirmDeleteModal({
  open,
  targetName,
  description,
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  targetName: string;
  description?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 id="confirm-delete-title" className="text-lg font-semibold text-slate-800">
          削除の確認
        </h2>
        <p className="mt-3 text-sm text-slate-600">
          「<span className="font-medium">{targetName}</span>」を削除してよろしいですか？
        </p>
        {description && <p className="mt-2 text-xs text-slate-500">{description}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            キャンセル
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "削除中…" : "削除"}
          </button>
        </div>
      </div>
    </div>
  );
}
