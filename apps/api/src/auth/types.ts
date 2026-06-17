import type { RoleName } from "@repo/shared";

export const ROLE_HIERARCHY: Record<RoleName, number> = {
  user: 0,
  admin: 1,
};

export const IS_PUBLIC_KEY = "isPublic";
export const ROLES_KEY = "roles";
export const MIN_ROLE_KEY = "minRole";

export const DB_TOKEN = Symbol("DB_TOKEN");
