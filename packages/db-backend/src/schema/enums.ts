import { ROLE_NAMES, USER_STATUSES } from "@repo/shared";
import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ROLE_NAMES);

export const userStatusEnum = pgEnum("user_status", USER_STATUSES);
