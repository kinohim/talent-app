import { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

/**
 * 詳細設計書1章: セッションにはemployeeId / role / departmentId /
 * resolvedDepartmentId（部署レベルに解決済みの組織ID、ADR 0008のdeptOf）を載せ、
 * 権限判定（src/lib/authz.ts）はこれらで完結させる。nameは表示用。
 */
declare module "next-auth" {
  interface Session {
    user: {
      employeeId: string;
      role: Role;
      departmentId: number | null;
      resolvedDepartmentId: number | null;
      name: string;
    };
  }

  interface User {
    employeeId: string;
    role: Role;
    departmentId: number | null;
    resolvedDepartmentId: number | null;
    name: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    employeeId: string;
    role: Role;
    departmentId: number | null;
    resolvedDepartmentId: number | null;
    name: string;
  }
}
