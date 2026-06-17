import { index, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

/**
 * Example domain table — demonstrates UUID PK, timestamps, an FK to `profiles`,
 * and an index. Replace with your own product tables.
 */
export const exampleEntities = pgTable(
  "example_entities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("example_entities_profile_id_idx").on(t.profileId)],
);
