import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildDepartmentTree, flattenDepartmentOptions, loadDepartments } from "@/lib/department-tree";
import { AccountForm } from "@/components/AccountForm";

type RouteParams = { params: Promise<{ employeeId: string }> };

/**
 * EDT007 アカウント編集（/admin/accounts/[employeeId]/edit、ADMINのみ）。
 * 所属部署・権限の変更、退職・無効化処理（isActive）を行う（PATCH /api/accounts/[employeeId]）。
 */
export default async function EditAccountPage({ params }: RouteParams) {
  const { employeeId } = await params;

  const [user, departmentRecords] = await Promise.all([
    prisma.user.findUnique({ where: { employeeId }, include: { employee: true } }),
    loadDepartments(false),
  ]);
  if (!user) notFound();

  const departmentOptions = flattenDepartmentOptions(buildDepartmentTree(departmentRecords));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">アカウント編集</h1>
      <p className="text-sm text-slate-500">
        {user.employee.name}（{employeeId}）
      </p>
      <AccountForm
        mode="edit"
        departments={departmentOptions}
        initialData={{
          employeeId: user.employeeId,
          name: user.employee.name,
          nameKana: user.employee.nameKana,
          email: user.email,
          departmentId: user.employee.departmentId,
          role: user.role,
          isActive: user.isActive,
        }}
      />
    </div>
  );
}
