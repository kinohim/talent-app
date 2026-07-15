import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getApiSession } from "@/lib/api-auth";
import {
  canEditDepartmentField,
  canEditEmployee,
  canViewEmployee,
  requireAdmin,
} from "@/lib/authz";
import {
  apiConflict,
  apiForbidden,
  apiInternalError,
  apiNotFound,
  apiUnauthenticated,
  apiValidationError,
} from "@/lib/api-response";
import { employeeDetailInclude, serializeEmployeeDetail } from "@/lib/employee-select";
import { employeeUpdateSchema } from "@/lib/validation/employee";

type RouteParams = { params: Promise<{ employeeId: string }> };

/**
 * GET /api/employees/[employeeId] — 経歴書詳細取得（REF003/REF005）。
 * GENERALは部署レベル一致（自部署）のみ閲覧可（ADR 0008）。
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const { employeeId } = await params;
  const employee = await prisma.employee.findUnique({
    where: { employeeId },
    include: employeeDetailInclude,
  });

  if (!employee) return apiNotFound();

  if (!(await canViewEmployee(session, employee))) {
    return apiForbidden("同じ部署の社員の経歴書のみ閲覧できます");
  }

  return NextResponse.json(serializeEmployeeDetail(employee));
}

/**
 * PATCH /api/employees/[employeeId] — 経歴書のセクション部分更新（EDT001〜005）。
 * docs/design/api-design.md 2.2: リクエストボディはbasic/summary/skills/certifications/projectsの
 * いずれかのセクションキーのみを含み、未指定のセクションは変更しない。
 * basic.departmentIdはADMINのみ変更可で、それ以外のロールが送ってもサーバー側で無視する。
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();

  const { employeeId } = await params;
  const target = await prisma.employee.findUnique({ where: { employeeId } });
  if (!target || target.deletedAt) return apiNotFound();

  if (!(await canEditEmployee(session, target))) {
    return apiForbidden("この社員の経歴書を編集する権限がありません");
  }

  const json = await req.json();
  const parsed = employeeUpdateSchema.safeParse(json);
  if (!parsed.success) return apiValidationError(parsed.error);
  const body = parsed.data;

  const actor = session.user.employeeId;

  try {
    await prisma.$transaction(async (tx) => {
      if (body.basic) {
        const basic = body.basic;
        await tx.employee.update({
          where: { employeeId },
          data: {
            name: basic.name,
            nameKana: basic.nameKana,
            birthDate: basic.birthDate ? new Date(basic.birthDate) : null,
            gender: basic.gender ?? null,
            // 所属組織はADMINのみ変更可（detailed-design.md EDT001）。他ロールの送信値は無視
            ...(canEditDepartmentField(session)
              ? { departmentId: basic.departmentId ?? null }
              : {}),
            nearestStationId: basic.nearestStationId ?? null,
            hireDate: basic.hireDate ? new Date(basic.hireDate) : null,
            finalSchoolName: basic.finalSchoolName ?? null,
            finalDepartmentName: basic.finalDepartmentName ?? null,
            finalSchoolType: basic.finalSchoolType ?? null,
            graduationYearMonth: basic.graduationYearMonth
              ? new Date(`${basic.graduationYearMonth}-01`)
              : null,
            graduationStatus: basic.graduationStatus ?? null,
            updatedBy: actor,
          },
        });
      }

      if (body.summary) {
        await tx.employee.update({
          where: { employeeId },
          data: {
            careerSummary: body.summary.careerSummary ?? null,
            selfPr: body.summary.selfPr ?? null,
            updatedBy: actor,
          },
        });
      }

      if (body.skills) {
        await tx.employeeSkillLink.deleteMany({ where: { employeeId } });
        if (body.skills.length > 0) {
          await tx.employeeSkillLink.createMany({
            data: body.skills.map((s) => ({
              employeeId,
              skillId: s.skillId,
              skillVersionId: s.skillVersionId ?? null,
              skillLevel: s.skillLevel ?? null,
              createdBy: actor,
              updatedBy: actor,
            })),
          });
        }
        await tx.employee.update({ where: { employeeId }, data: { updatedBy: actor } });
      }

      if (body.certifications) {
        await tx.employeeCertificationLink.deleteMany({ where: { employeeId } });
        if (body.certifications.length > 0) {
          await tx.employeeCertificationLink.createMany({
            data: body.certifications.map((c) => ({
              employeeId,
              certificationId: c.certificationId,
              acquiredDate: c.acquiredDate ? new Date(c.acquiredDate) : null,
              expirationDate: c.expirationDate ? new Date(c.expirationDate) : null,
              createdBy: actor,
              updatedBy: actor,
            })),
          });
        }
        await tx.employee.update({ where: { employeeId }, data: { updatedBy: actor } });
      }

      // EDT005（プロジェクト経歴）の編集UIはStage 3スコープだが、APIのセクション受け口は
      // 設計どおり用意しておく（api-design.md 2.2）。
      if (body.projects) {
        const existingProjects = await tx.project.findMany({
          where: { employeeId },
          select: { id: true },
        });
        const existingProjectIds = existingProjects.map((p) => p.id);
        if (existingProjectIds.length > 0) {
          await tx.projectSkillLink.deleteMany({ where: { projectId: { in: existingProjectIds } } });
          await tx.projectRoleLink.deleteMany({ where: { projectId: { in: existingProjectIds } } });
          await tx.projectDetail.deleteMany({ where: { projectId: { in: existingProjectIds } } });
          await tx.project.deleteMany({ where: { id: { in: existingProjectIds } } });
        }

        for (const project of body.projects) {
          const created = await tx.project.create({
            data: {
              employeeId,
              siteId: project.siteId,
              projectTitle: project.projectTitle,
              projectSummary: project.projectSummary ?? null,
              startDate: project.startDate ? new Date(project.startDate) : null,
              endDate: project.endDate ? new Date(project.endDate) : null,
              totalTeamSize: project.totalTeamSize ?? null,
              teamSize: project.teamSize ?? null,
              createdBy: actor,
              updatedBy: actor,
            },
          });

          if (project.roleIds.length > 0) {
            await tx.projectRoleLink.createMany({
              data: project.roleIds.map((roleId) => ({
                projectId: created.id,
                projectRoleId: roleId,
                createdBy: actor,
                updatedBy: actor,
              })),
            });
          }

          if (project.skillLinks.length > 0) {
            await tx.projectSkillLink.createMany({
              data: project.skillLinks.map((sl) => ({
                projectId: created.id,
                skillId: sl.skillId,
                skillVersionId: sl.skillVersionId ?? null,
                createdBy: actor,
                updatedBy: actor,
              })),
            });
          }

          if (project.detail) {
            await tx.projectDetail.create({
              data: {
                projectId: created.id,
                overview: project.detail.overview ?? null,
                researchAnalysis: project.detail.researchAnalysis ?? null,
                requirementsDefinition: project.detail.requirementsDefinition ?? null,
                basicDesign: project.detail.basicDesign ?? null,
                detailedDesign: project.detail.detailedDesign ?? null,
                development: project.detail.development ?? null,
                testing: project.detail.testing ?? null,
                operation: project.detail.operation ?? null,
                createdBy: actor,
                updatedBy: actor,
              },
            });
          }
        }
      }
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return apiConflict("同一のスキル・資格・役割が重複しています");
    }
    console.error(err);
    return apiInternalError();
  }

  const updated = await prisma.employee.findUniqueOrThrow({
    where: { employeeId },
    select: { employeeId: true, updatedAt: true },
  });
  return NextResponse.json(updated);
}

/** DELETE /api/employees/[employeeId] — 論理削除（ADMINのみ）。 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { employeeId } = await params;
  const target = await prisma.employee.findUnique({ where: { employeeId } });
  if (!target || target.deletedAt) return apiNotFound();

  await prisma.employee.update({
    where: { employeeId },
    data: { deletedAt: new Date(), deletedBy: session.user.employeeId },
  });

  return NextResponse.json({ employeeId });
}
