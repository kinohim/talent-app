"use client";

import { useState } from "react";

/**
 * マスタ管理画面（S-14/S-15/S-18等）共通コンポーネント。
 * docs/design/screens.md「実装上の提案」: カラム定義とAPIエンドポイントだけ差し替えて使い回す。
 *
 * Client Componentなので、Server Component（各admin配下のpage.tsx）からは関数を一切渡さない
 * （RSCのシリアライズ制約でエラーになる）。columns/fieldsはプレーンなデータのみで表現し、
 * フォーム初期値・送信ペイロードの組み立てはfields定義からこのコンポーネント内部で導出する。
 */

export type AdminRecord = { id: number } & Record<string, unknown>;

export type FieldDef =
  | { name: string; label: string; type: "text"; required?: boolean; maxLength?: number; nullable?: boolean }
  | {
      name: string;
      label: string;
      type: "select";
      required?: boolean;
      valueType: "number" | "string";
      options: { value: string; label: string }[];
    }
  | { name: string; label: string; type: "checkbox" };

export type ColumnDef = {
  key: string;
  label: string;
  format?: "boolean-yes-no";
};

type Props = {
  resourceLabel: string;
  apiBase: string;
  columns: ColumnDef[];
  fields: FieldDef[];
  initialItems: AdminRecord[];
};

function renderCell(item: AdminRecord, col: ColumnDef): string {
  const value = item[col.key];
  if (col.format === "boolean-yes-no") {
    return value ? "あり" : "なし";
  }
  return value === null || value === undefined ? "" : String(value);
}

function getFormValues(fields: FieldDef[], item: AdminRecord | null): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of fields) {
    if (field.type === "checkbox") {
      values[field.name] = item?.[field.name] === true ? "true" : "false";
    } else {
      const value = item?.[field.name];
      values[field.name] = value === null || value === undefined ? "" : String(value);
    }
  }
  return values;
}

function buildPayload(fields: FieldDef[], values: Record<string, string>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "checkbox") {
      payload[field.name] = values[field.name] === "true";
      continue;
    }
    if (field.type === "select" && field.valueType === "number") {
      payload[field.name] = values[field.name] ? Number(values[field.name]) : null;
      continue;
    }
    const trimmed = (values[field.name] ?? "").trim();
    payload[field.name] = trimmed === "" && field.type === "text" && field.nullable ? null : trimmed;
  }
  return payload;
}

export function AdminMasterTable({ resourceLabel, apiBase, columns, fields, initialItems }: Props) {
  const [items, setItems] = useState<AdminRecord[]>(initialItems);
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function startCreate() {
    setEditingId("new");
    setValues(getFormValues(fields, null));
    setError(null);
  }

  function startEdit(item: AdminRecord) {
    setEditingId(item.id);
    setValues(getFormValues(fields, item));
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setError(null);
  }

  async function refresh() {
    const res = await fetch(apiBase);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = buildPayload(fields, values);
    const isNew = editingId === "new";
    const res = await fetch(isNew ? apiBase : `${apiBase}/${editingId}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error?.message ?? "保存に失敗しました");
      return;
    }

    setEditingId(null);
    await refresh();
  }

  async function handleDelete(id: number) {
    if (!confirm(`この${resourceLabel}を削除してよろしいですか？`)) return;
    const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
    if (res.ok) {
      await refresh();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{resourceLabel}一覧</h2>
        {editingId === null && (
          <button className="btn-primary" onClick={startCreate}>
            新規追加
          </button>
        )}
      </div>

      {editingId !== null && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="font-semibold">{editingId === "new" ? "新規追加" : "編集"}</h3>
          {fields.map((field) => (
            <div key={field.name}>
              <label className="form-label" htmlFor={field.name}>
                {field.label}
                {field.type !== "checkbox" && field.required && <span className="ml-1 text-red-500">*</span>}
              </label>
              {field.type === "text" && (
                <input
                  id={field.name}
                  className="form-input"
                  value={values[field.name] ?? ""}
                  maxLength={field.maxLength}
                  required={field.required}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                />
              )}
              {field.type === "select" && (
                <select
                  id={field.name}
                  className="form-input"
                  value={values[field.name] ?? ""}
                  required={field.required}
                  onChange={(e) => setValues((v) => ({ ...v, [field.name]: e.target.value }))}
                >
                  <option value="">選択してください</option>
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}
              {field.type === "checkbox" && (
                <input
                  id={field.name}
                  type="checkbox"
                  checked={values[field.name] === "true"}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [field.name]: e.target.checked ? "true" : "false" }))
                  }
                />
              )}
            </div>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "保存中…" : "保存"}
            </button>
            <button type="button" className="btn-secondary" onClick={cancelEdit}>
              キャンセル
            </button>
          </div>
        </form>
      )}

      <table className="table-base">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              {columns.map((col) => (
                <td key={col.key}>{renderCell(item, col)}</td>
              ))}
              <td className="space-x-2 whitespace-nowrap">
                <button className="text-brand-600 hover:underline" onClick={() => startEdit(item)}>
                  編集
                </button>
                <button className="text-red-600 hover:underline" onClick={() => handleDelete(item.id)}>
                  削除
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={columns.length + 1} className="py-6 text-center text-slate-400">
                データがありません
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
