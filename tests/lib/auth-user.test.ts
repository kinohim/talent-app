import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * src/lib/auth-user.ts のユニットテスト（resolveLoginUser）。
 * ADR 0009: 未登録・無効化アカウントのエラーメッセージが
 * docs/design/detailed-design.md 1章の文言と一致することを保証する。
 */

const findFirstMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: (...args: unknown[]) => findFirstMock(...args),
    },
  },
}));

import {
  AUTH_ERROR_INACTIVE,
  AUTH_ERROR_NOT_REGISTERED,
  resolveLoginUser,
} from "@/lib/auth-user";

function makeUser(overrides: Partial<{ isActive: boolean; employeeDeletedAt: Date | null }> = {}) {
  return {
    id: 1,
    employeeId: "000001",
    email: "taro@example.com",
    isActive: overrides.isActive ?? true,
    employee: {
      employeeId: "000001",
      name: "山田太郎",
      departmentId: 10,
      deletedAt: overrides.employeeDeletedAt ?? null,
    },
  };
}

beforeEach(() => {
  findFirstMock.mockReset();
});

describe("resolveLoginUser", () => {
  it("有効なアカウントを識別子（email）で解決できる", async () => {
    const user = makeUser();
    findFirstMock.mockResolvedValue(user);

    await expect(resolveLoginUser("taro@example.com")).resolves.toBe(user);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { deletedAt: null, OR: [{ email: "taro@example.com" }, { employeeId: "taro@example.com" }] },
      include: { employee: true },
    });
  });

  it("有効なアカウントを識別子（社員ID）で解決できる", async () => {
    const user = makeUser();
    findFirstMock.mockResolvedValue(user);

    await expect(resolveLoginUser("000001")).resolves.toBe(user);
  });

  it("該当するUserが存在しない場合はAUTH_ERROR_NOT_REGISTERED", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(resolveLoginUser("unknown@example.com")).rejects.toThrow(
      AUTH_ERROR_NOT_REGISTERED
    );
  });

  it("Employeeが削除済みの場合はAUTH_ERROR_NOT_REGISTERED", async () => {
    findFirstMock.mockResolvedValue(makeUser({ employeeDeletedAt: new Date() }));

    await expect(resolveLoginUser("taro@example.com")).rejects.toThrow(
      AUTH_ERROR_NOT_REGISTERED
    );
  });

  it("isActive=falseの場合はAUTH_ERROR_INACTIVE", async () => {
    findFirstMock.mockResolvedValue(makeUser({ isActive: false }));

    await expect(resolveLoginUser("taro@example.com")).rejects.toThrow(AUTH_ERROR_INACTIVE);
  });

  it("空文字・空白のみの識別子はDBに問い合わせずAUTH_ERROR_NOT_REGISTERED", async () => {
    await expect(resolveLoginUser("   ")).rejects.toThrow(AUTH_ERROR_NOT_REGISTERED);
    expect(findFirstMock).not.toHaveBeenCalled();
  });
});
