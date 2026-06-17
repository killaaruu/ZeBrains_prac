import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { db } from "@repo/db-backend";
import { DrizzleHealthIndicator } from "./drizzle.health";
import { HealthController } from "./health.controller";

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [{ provide: "DRIZZLE_DB", useValue: db }, DrizzleHealthIndicator],
})
export class HealthModule {}
