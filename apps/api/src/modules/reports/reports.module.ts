import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { db } from "@repo/db-backend";
import { REPORT_GENERATION_QUEUE } from "../../queue/queue.constants";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [BullModule.registerQueue({ name: REPORT_GENERATION_QUEUE })],
  controllers: [ReportsController],
  providers: [{ provide: "DRIZZLE_DB", useValue: db }, ReportsService],
})
export class ReportsModule {}
