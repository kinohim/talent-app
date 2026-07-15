"use client";

import { useMemo, useState } from "react";
import type { OrgLevel } from "@prisma/client";
import { ConfirmDeleteModal } from "@/components/ConfirmDeleteModal";

/**
 * MST004 部署マスタ管理（/admin/departments）専用コンポーネント。
 * docs/design/screens.md: 組織単位（事業部＞部署＞Gr）の3階層ツリー。AdminMasterTable（フラット一覧）は
 * この階層構造に向かないため、専用実装とする（screens.md「実装上の提案」）。
 * 「追加」ボタンは事業部専用、部署・Grは各行の「配下に追加」から作成する。
 */

export type DepartmentTreeNode = {
  id: number;
  code: string;
  departmentName: string;
  orgLevel: OrgLevel;
  parentId: number | null;
  children: DepartmentTreeNode[];
};

const ORG_LEVEL_LABEL: Record<OrgLevel, string> = {
  DIVISION: "事業部",
  DEPARTMENT: "部署",
  GROUP: "Gr",
};

function childLevelOf(orgLevel: OrgLevel): OrgLevel | null {
  if (orgLevel === "DIVISION") return "DEPARTMENT";
  if (orgLevel === "DEPARTMENT") return "GROUP";
  return null;
}

function flattenById(nodes: DepartmentTreeNode[]): Map<number, DepartmentTreeNode> {
  const map = new Map<number, DepartmentTreeNode>();
  const walk = (list: DepartmentTreeNode[]) => {
    for (const node of list) {
      map.set(node.id, node);
      walk(node.children);
    }
  };
  walk(nodes);
  return map;
}

function countDescendants(node: DepartmentTreeNode): number {
  return node.children.reduce((sum, child) => sum + 1 + countDescendants(child), 0);
}

type FormTarget = {
  orgLevel: OrgLevel;
  parentId: number | null;
  editingId: number | null;
};

export function DepartmentTreeManager({ initialTree }: { initialTree: DepartmentTreeNode[] }) {
  const [tree, setTree] = useState<DepartmentTreeNode[]>(initialTree);
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [departmentName, setDepartmentName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DepartmentTreeNode | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const byId = useMemo(() => flattenById(tree), [tree]);

  async function refresh() {
    const res = await fetch("/api/departments");
    if (res.ok) {
      const data = await res.json();
      setTree(data.items);
    }
  }

  function openCreate(orgLevel: OrgLevel, parentId: number | null) {
    setFormTarget({ orgLevel, parentId, editingId: null });
    setDepartmentName("");
    setError(null);
  }

  function openEdit(node: DepartmentTreeNode) {
    setFormTarget({ orgLevel: node.orgLevel, parentId: node.parentId, editingId: node.id });
    setDepartmentName(node.departmentName);
    setError(null);
  }

  function closeForm() {
    setFormTarget(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formTarget) return;
    setSubmitting(true);
    setError(null);

    const payload = {
      departmentName: departmentName.trim(),
      orgLevel: formTarget.orgLevel,
      parentId: formTarget.parentId,
    };

    const isNew = formTarget.editingId === null;
    const res = await fetch(
      isNew ? "/api/departments" : `/api/departments/${formTarget.editingId}`,
      {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const details: { message: string }[] | undefined = data?.error?.details;
      setError(details?.[0]?.message ?? data?.error?.message ?? "保存に失敗しました");
      return;
    }

    setFormTarget(null);
    await refresh();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    setDeleteError(null);

    const res = await fetch(`/api/departments/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteBusy(false);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setDeleteError(data?.error?.message ?? "削除に失敗しました");
      return;
    }

    setDeleteTarget(null);
    await refresh();
  }

  function renderNode(node: DepartmentTreeNode, depth: number) {
    const childLevel = childLevelOf(node.orgLevel);
    return (
      <div key={node.id}>
        <div
          className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2"
          style={{ paddingLeft: depth * 24 }}
        >
          <div className="flex items-center gap-2">
            <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {ORG_LEVEL_LABEL[node.orgLevel]}
            </span>
            <span className="font-medium">{node.departmentName}</span>
            <span className="text-xs text-slate-400">（{node.code}）</span>
          </div>
          <div className="flex gap-3 text-sm">
            {childLevel && (
              <button
                type="button"
                className="text-brand-600 hover:underline"
                onClick={() => openCreate(childLevel, node.id)}
              >
                配下に追加
              </button>
            )}
            <button type="button" className="text-brand-600 hover:underline" onClick={() => openEdit(node)}>
              編集
            </button>
            <button
              type="button"
              className="text-red-600 hover:underline"
              onClick={() => {
                setDeleteError(null);
                setDeleteTarget(node);
              }}
            >
              削除
            </button>
          </div>
        </div>
        {node.children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  }

  const parentNode = formTarget?.parentId ? byId.get(formTarget.parentId) ?? null : null;
  const formTitle = formTarget
    ? `${formTarget.editingId === null ? "新規追加" : "編集"}（${ORG_LEVEL_LABEL[formTarget.orgLevel]}${
        parentNode ? ` / ${parentNode.departmentName} の配下` : ""
      }）`
    : "";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">組織一覧</h2>
        <button className="btn-primary" onClick={() => openCreate("DIVISION", null)}>
          事業部を追加
        </button>
      </div>

      {formTarget && (
        <form onSubmit={handleSubmit} className="card space-y-4">
          <h3 className="font-semibold">{formTitle}</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label" htmlFor="dept-name">
                組織名 <span className="text-red-500">*</span>
              </label>
              <input
                id="dept-name"
                className="form-input"
                value={departmentName}
                maxLength={100}
                required
                onChange={(e) => setDepartmentName(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "保存中…" : "保存"}
            </button>
            <button type="button" className="btn-secondary" onClick={closeForm}>
              キャンセル
            </button>
          </div>
        </form>
      )}

      <div className="card">
        {tree.length === 0 ? (
          <p className="py-6 text-center text-slate-400">データがありません</p>
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}
      </div>

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        targetName={deleteTarget?.departmentName ?? ""}
        description={
          deleteError ??
          (deleteTarget && countDescendants(deleteTarget) > 0
            ? `配下に${countDescendants(deleteTarget)}件の組織があるため削除できません。先に配下の組織を削除してください。`
            : undefined)
        }
        busy={deleteBusy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
