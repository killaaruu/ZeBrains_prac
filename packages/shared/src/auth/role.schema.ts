import { z } from "zod";

export const ROLE_NAMES = ["user", "admin"] as const;

export const roleNameSchema = z.enum(ROLE_NAMES);

export type RoleName = z.infer<typeof roleNameSchema>;
