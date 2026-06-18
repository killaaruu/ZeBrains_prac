import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Injectable, Logger } from "@nestjs/common";
import type { DrizzleDb } from "@repo/db-backend";
import { reports } from "@repo/db-backend/schema";
import type { ReportResult } from "@repo/shared";
import type { Job } from "bullmq";
import { and, eq } from "drizzle-orm";
import { type GenerateReportJobPayload, REPORT_GENERATION_QUEUE } from "../queue/queue.constants";
import { ReportGenerationGraph } from "./report-generation.graph";

@Injectable()
@Processor(REPORT_GENERATION_QUEUE)
export class ReportGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(ReportGenerationProcessor.name);

  constructor(
    @Inject("DRIZZLE_DB") private readonly db: DrizzleDb,
    private readonly graph: ReportGenerationGraph,
  ) {
    super();
  }

  async process(job: Job<GenerateReportJobPayload>): Promise<void> {
    const { reportId, userId, topic } = job.data;
    this.logger.log(`Processing report-generation job ${job.id} for report ${reportId}`);

    await this.markThinking(reportId, userId);

    try {
      const result = await this.graph.run({ reportId, userId, topic });
      await this.markDone(reportId, userId, result);
      this.logger.log(`Report ${reportId} completed`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown report generation error";
      await this.markError(reportId, userId, message);
      this.logger.error(`Report ${reportId} failed: ${message}`);
      throw error;
    }
  }

  private async markThinking(reportId: string, userId: string) {
    await this.db
      .update(reports)
      .set({ status: "thinking", error: null, updatedAt: new Date() })
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));
  }

  private async markDone(reportId: string, userId: string, result: ReportResult) {
    await this.db
      .update(reports)
      .set({ status: "done", result, error: null, updatedAt: new Date() })
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));
  }

  private async markError(reportId: string, userId: string, message: string) {
    await this.db
      .update(reports)
      .set({ status: "error", error: message, updatedAt: new Date() })
      .where(and(eq(reports.id, reportId), eq(reports.userId, userId)));
  }
}
