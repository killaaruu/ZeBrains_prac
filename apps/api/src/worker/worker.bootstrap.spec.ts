import { NestFactory } from "@nestjs/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapWorker } from "./worker.bootstrap";
import { WorkerModule } from "./worker.module";

vi.mock("@nestjs/core", () => ({
  NestFactory: {
    createApplicationContext: vi.fn(),
  },
}));

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

describe("bootstrapWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("starts a Nest application context for the worker module", async () => {
    const app = {
      close: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(NestFactory.createApplicationContext).mockResolvedValue(app as never);

    await bootstrapWorker();

    expect(NestFactory.createApplicationContext).toHaveBeenCalledWith(WorkerModule, {
      logger: ["log", "error", "warn", "debug", "verbose"],
    });
  });
});
