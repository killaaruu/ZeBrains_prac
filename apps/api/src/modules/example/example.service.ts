import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { DrizzleDb } from "@repo/db-backend";
import { exampleEntities } from "@repo/db-backend/schema";
import type {
  CreateExampleEntity,
  ExampleEntity,
  PaginationQuery,
  UpdateExampleEntity,
} from "@repo/shared";
import { desc, eq, sql } from "drizzle-orm";

type ExampleRow = typeof exampleEntities.$inferSelect;

/** Map a DB row to the shared `ExampleEntity` contract (Dates → ISO strings). */
export function mapExampleEntity(row: ExampleRow): ExampleEntity {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class ExampleService {
  constructor(@Inject("DRIZZLE_DB") private readonly db: DrizzleDb) {}

  async list(query: PaginationQuery): Promise<{ items: ExampleEntity[]; total: number }> {
    const rows = await this.db
      .select()
      .from(exampleEntities)
      .orderBy(desc(exampleEntities.createdAt))
      .limit(query.limit)
      .offset(query.offset);

    const [{ count }] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(exampleEntities);

    return { items: rows.map(mapExampleEntity), total: count };
  }

  async getById(id: string): Promise<ExampleEntity> {
    const [row] = await this.db
      .select()
      .from(exampleEntities)
      .where(eq(exampleEntities.id, id))
      .limit(1);

    if (!row) throw new NotFoundException(`Example entity ${id} not found`);
    return mapExampleEntity(row);
  }

  async create(input: CreateExampleEntity, profileId?: string): Promise<ExampleEntity> {
    const [row] = await this.db
      .insert(exampleEntities)
      .values({
        name: input.name,
        description: input.description ?? null,
        profileId: profileId ?? null,
      })
      .returning();

    return mapExampleEntity(row);
  }

  async update(id: string, input: UpdateExampleEntity): Promise<ExampleEntity> {
    const [row] = await this.db
      .update(exampleEntities)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(exampleEntities.id, id))
      .returning();

    if (!row) throw new NotFoundException(`Example entity ${id} not found`);
    return mapExampleEntity(row);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.db
      .delete(exampleEntities)
      .where(eq(exampleEntities.id, id))
      .returning({ id: exampleEntities.id });

    if (deleted.length === 0) throw new NotFoundException(`Example entity ${id} not found`);
  }
}
