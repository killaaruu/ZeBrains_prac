import { InjectQueue } from "@nestjs/bullmq";
import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { DrizzleDb } from "@repo/db-backend";
import { reports } from "@repo/db-backend/schema";
import type { CreateReport, Report } from "@repo/shared";
import { reportResultSchema } from "@repo/shared";
import type { Queue } from "bullmq";
import { and, desc, eq } from "drizzle-orm";
import {
  GENERATE_REPORT_JOB,
  type GenerateReportJobPayload,
  REPORT_GENERATION_QUEUE,
} from "../../queue/queue.constants";

type ReportRow = typeof reports.$inferSelect;

export function mapReportRow(row: ReportRow): Report {
  return {
    id: row.id,
    userId: row.userId,
    topic: row.topic,
    status: row.status,
    result: row.result ? reportResultSchema.parse(row.result) : null,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @Inject("DRIZZLE_DB") private readonly db: DrizzleDb,
    @InjectQueue(REPORT_GENERATION_QUEUE)
    private readonly reportsQueue: Queue<GenerateReportJobPayload>,
  ) {}

  async create(input: CreateReport, userId: string): Promise<{ id: string }> {
    const [row] = await this.db.insert(reports).values({ topic: input.topic, userId }).returning();

    await this.reportsQueue.add(GENERATE_REPORT_JOB, {
      reportId: row.id,
      topic: row.topic,
      userId: row.userId,
    });

    this.logger.log(`Queued report ${row.id} for user ${userId}`);
    return { id: row.id };
  }

  async list(userId: string): Promise<Report[]> {
    const rows = await this.db
      .select()
      .from(reports)
      .where(eq(reports.userId, userId))
      .orderBy(desc(reports.createdAt));

    return rows.map(mapReportRow);
  }

  async getById(id: string, userId: string): Promise<Report> {
    const [row] = await this.db
      .select()
      .from(reports)
      .where(and(eq(reports.id, id), eq(reports.userId, userId)))
      .limit(1);

    if (!row) throw new NotFoundException(`Report ${id} not found`);
    return mapReportRow(row);
  }
}
