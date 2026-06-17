import { index, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { userRoleEnum, userStatusEnum } from "./enums";

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authUid: uuid("auth_uid").unique().notNull(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    firstName: varchar("first_name", { length: 100 }).notNull().default(""),
    lastName: varchar("last_name", { length: 100 }).notNull().default(""),
    role: userRoleEnum("role").default("user").notNull(),
    status: userStatusEnum("status").default("pending").notNull(),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("profiles_auth_uid_idx").on(t.authUid),
    index("profiles_role_idx").on(t.role),
    index("profiles_status_idx").on(t.status),
  ],
);
