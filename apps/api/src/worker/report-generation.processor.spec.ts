import { type ReportResult, ruMarketNotFound } from "@repo/shared";
import type { Job } from "bullmq";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GENERATE_REPORT_JOB, type GenerateReportJobPayload } from "../queue/queue.constants";
import type { ReportGenerationGraph } from "./report-generation.graph";
import { ReportGenerationProcessor } from "./report-generation.processor";

vi.mock("@langchain/langgraph", () => {
  const Annotation = () => ({});
  Annotation.Root = () => ({ State: {} });

  return {
    Annotation,
    END: "__end__",
    START: "__start__",
    StateGraph: class MockStateGraph {},
  };
});

const payload: GenerateReportJobPayload = {
  reportId: "00000000-0000-4000-8000-000000000000",
  userId: "11111111-1111-4111-8111-111111111111",
  topic: "AI coding assistants",
};

const result: ReportResult = {
  trend_name: "AI coding assistants",
  global_market: [
    {
      product: "Copilot",
      company: "GitHub",
      effects: "Developer productivity gains",
      sources: ["https://example.com/copilot"],
    },
  ],
  ru_market: ruMarketNotFound,
  sustainability: {
    score: 7,
    arguments_for: ["Strong enterprise demand"],
    arguments_against: ["Quality depends on source material"],
  },
};

function createDbMock() {
  const where = vi.fn().mockResolvedValue([]);
  const set = vi.fn(() => ({ where }));

  return {
    db: {
      update: vi.fn(() => ({ set })),
    },
    fns: { set, where },
  };
}

function createJob(data: GenerateReportJobPayload = payload): Job<GenerateReportJobPayload> {
  return {
    id: "job-1",
    name: GENERATE_REPORT_JOB,
    data,
  } as Job<GenerateReportJobPayload>;
}

describe("ReportGenerationProcessor", () => {
  let graph: { run: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    graph = { run: vi.fn().mockResolvedValue(result) };
  });

  it("marks a picked-up job thinking, runs the graph, then stores a done result", async () => {
    const { db, fns } = createDbMock();
    const processor = new ReportGenerationProcessor(
      db as never,
      graph as unknown as ReportGenerationGraph,
    );

    await processor.process(createJob());

    expect(graph.run).toHaveBeenCalledWith({
      reportId: payload.reportId,
      topic: "AI coding assistants",
      userId: payload.userId,
    });
    expect(fns.set).toHaveBeenNthCalledWith(1, {
      status: "thinking",
      error: null,
      updatedAt: expect.any(Date),
    });
    expect(fns.set).toHaveBeenNthCalledWith(2, {
      status: "done",
      result,
      error: null,
      updatedAt: expect.any(Date),
    });
  });

  it("marks a failed job as error with the failure message", async () => {
    const { db, fns } = createDbMock();
    graph.run.mockRejectedValue(new Error("graph unavailable"));
    const processor = new ReportGenerationProcessor(
      db as never,
      graph as unknown as ReportGenerationGraph,
    );

    await expect(processor.process(createJob())).rejects.toThrow("graph unavailable");

    expect(fns.set).toHaveBeenNthCalledWith(1, {
      status: "thinking",
      error: null,
      updatedAt: expect.any(Date),
    });
    expect(fns.set).toHaveBeenNthCalledWith(2, {
      status: "error",
      error: "graph unavailable",
      updatedAt: expect.any(Date),
    });
  });
});
