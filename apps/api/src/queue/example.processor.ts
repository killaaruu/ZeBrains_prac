import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { EXAMPLE_QUEUE } from "./queue.constants";

export interface ExampleJobData {
  message: string;
}

/**
 * Minimal BullMQ worker demonstrating the `@Processor` pattern. It just logs the
 * job payload — replace with real background work.
 */
@Processor(EXAMPLE_QUEUE)
export class ExampleProcessor extends WorkerHost {
  private readonly logger = new Logger(ExampleProcessor.name);

  async process(job: Job<ExampleJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id}: ${job.data.message}`);
  }
}
