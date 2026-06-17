import { z } from "zod";
import { roleNameSchema } from "./role.schema";

export const USER_STATUSES = ["pending", "active", "inactive"] as const;

export const userStatusSchema = z.enum(USER_STATUSES);

export type UserStatus = z.infer<typeof userStatusSchema>;

export const requestUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  role: roleNameSchema,
  status: userStatusSchema,
});

export type RequestUser = z.infer<typeof requestUserSchema>;
