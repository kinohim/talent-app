"use client";

/**
 * EDT001〜004共通: 経歴書のセクション部分更新（PATCH /api/employees/[employeeId]）。
 * docs/design/api-design.md 2.2: 該当セクションのキーのみを送信し、未指定セクションは変更しない。
 * エラーは共通形式（error.code/message/details）を受け取り、表示用メッセージ配列に変換する
 * （docs/design/detailed-design.md 5章）。
 */
export async function patchEmployeeSection(
  employeeId: string,
  payload: Record<string, unknown>
): Promise<string[] | null> {
  const res = await fetch(`/api/employees/${employeeId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.ok) return null;

  const data = await res.json().catch(() => null);
  const details: { field: string; message: string }[] | undefined = data?.error?.details;
  if (details && details.length > 0) {
    return details.map((d) => d.message);
  }
  return [data?.error?.message ?? "保存に失敗しました"];
}

export function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm text-red-600">
      {errors.map((message, i) => (
        <li key={i}>{message}</li>
      ))}
    </ul>
  );
}

/** 編集画面の右上にも保存ボタンを表示する（画面下部のFormActionsと同じフォームを送信する）。 */
export function TopSaveButton({ submitting }: { submitting: boolean }) {
  return (
    <div className="flex justify-end">
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "保存中…" : "保存"}
      </button>
    </div>
  );
}

export function FormActions({
  submitting,
  onCancel,
}: {
  submitting: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-3">
      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? "保存中…" : "保存"}
      </button>
      <button type="button" className="btn-secondary" onClick={onCancel}>
        キャンセル
      </button>
    </div>
  );
}
