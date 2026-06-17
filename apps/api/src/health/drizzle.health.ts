import { Inject, Injectable, Logger } from "@nestjs/common";
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import type { DrizzleDb } from "@repo/db-backend";
import { sql } from "drizzle-orm";

@Injectable()
export class DrizzleHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(DrizzleHealthIndicator.name);

  constructor(@Inject("DRIZZLE_DB") private readonly db: DrizzleDb) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return this.getStatus(key, true);
    } catch (error) {
      this.logger.error(
        `Health check failed for '${key}': ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new HealthCheckError(`${key} is not available`, this.getStatus(key, false));
    }
  }
}
