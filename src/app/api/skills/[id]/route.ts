import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { apiForbidden, apiNotFound, apiUnauthenticated, apiValidationError } from "@/lib/api-response";
import { skillSchema } from "@/lib/validation/master";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/skills/[id] — スキル更新（ADMINのみ、MST001）。
 * versionsが指定された場合はSkillVersionを名前で同期する
 * （既存にない名前は追加、リストにない既存バージョンは論理削除。参照中のリンクは残す方針）。
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { id } = await params;
  const skillId = Number(id);
  const existing = await prisma.skill.findUnique({ where: { id: skillId } });
  if (!existing || existing.deletedAt) return apiNotFound();

  const parsed = skillSchema.safeParse(await req.json());
  if (!parsed.success) return apiValidationError(parsed.error);
  const { versions, ...data } = parsed.data;
  const actor = session.user.employeeId;

  const updated = await prisma.$transaction(async (tx) => {
    if (versions !== undefined) {
      const versionNames = [...new Set(versions)];
      const existingVersions = await tx.skillVersion.findMany({
        where: { skillId, deletedAt: null },
      });
      const existingByName = new Map(existingVersions.map((v) => [v.versionName, v]));

      // リストから外れたバージョンは論理削除
      for (const version of existingVersions) {
        if (!versionNames.includes(version.versionName)) {
          await tx.skillVersion.update({
            where: { id: version.id },
            data: { deletedAt: new Date(), deletedBy: actor },
          });
        }
      }

      // 追加分の作成と表示順の更新
      for (const [index, versionName] of versionNames.entries()) {
        const current = existingByName.get(versionName);
        if (current) {
          await tx.skillVersion.update({
            where: { id: current.id },
            data: { versionOrder: index + 1, updatedBy: actor },
          });
        } else {
          await tx.skillVersion.create({
            data: {
              skillId,
              versionName,
              versionOrder: index + 1,
              createdBy: actor,
              updatedBy: actor,
            },
          });
        }
      }

      return tx.skill.update({
        where: { id: skillId },
        data: { ...data, hasVersion: versionNames.length > 0, updatedBy: actor },
      });
    }

    return tx.skill.update({
      where: { id: skillId },
      data: { ...data, updatedBy: actor },
    });
  });

  return NextResponse.json(updated);
}

/** 削除操作は論理削除。関連するEmployeeSkillLink等は残し、参照側で表示時に配慮する（detailed-design.md 3章）。 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const session = await getApiSession();
  if (!session) return apiUnauthenticated();
  if (!requireAdmin(session)) return apiForbidden();

  const { id } = await params;
  const existing = await prisma.skill.findUnique({ where: { id: Number(id) } });
  if (!existing || existing.deletedAt) return apiNotFound();

  await prisma.skill.update({
    where: { id: Number(id) },
    data: { deletedAt: new Date(), deletedBy: session.user.employeeId },
  });
  return NextResponse.json({ id: Number(id) });
}
