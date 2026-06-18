/** Example BullMQ queue — replace with your product's queues. */
export const EXAMPLE_QUEUE = "example";
export const REPORT_GENERATION_QUEUE = "report-generation";
export const GENERATE_REPORT_JOB = "generate-report";

export interface GenerateReportJobPayload {
  reportId: string;
  userId: string;
  topic: string;
}
