import { SetMetadata } from "@nestjs/common";
import type { RoleName } from "@repo/shared";
import { MIN_ROLE_KEY, ROLES_KEY } from "../types";

export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

export const MinRole = (role: RoleName) => SetMetadata(MIN_ROLE_KEY, role);
