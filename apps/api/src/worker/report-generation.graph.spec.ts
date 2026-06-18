import type { ReportResult } from "@repo/shared";
import { ruMarketNotFound } from "@repo/shared";
import { describe, expect, it, vi } from "vitest";
import type { OllamaProvider } from "./ollama.provider";
import { ReportGenerationGraph } from "./report-generation.graph";

vi.mock("@langchain/langgraph", () => {
  const Annotation = () => ({});
  Annotation.Root = () => ({ State: {} });

  class MockStateGraph {
    private nodes = new Map<string, (state: unknown) => unknown>();

    addNode(name: string, handler: (state: unknown) => unknown) {
      this.nodes.set(name, handler);
      return this;
    }

    addEdge() {
      return this;
    }

    compile() {
      return {
        invoke: async (input: unknown) => {
          const assemble = this.nodes.get("assemble");

          if (!assemble) {
            return input;
          }

          const result = await assemble(input);
          return { ...((input ?? {}) as object), ...((result ?? {}) as object) };
        },
      };
    }
  }

  return {
    Annotation,
    END: "__end__",
    START: "__start__",
    StateGraph: MockStateGraph,
  };
});

const generatedReport: ReportResult = {
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

describe("ReportGenerationGraph", () => {
  it("generates the report through the shared provider", async () => {
    const provider = {
      generate: vi.fn().mockResolvedValue(generatedReport),
    };

    const graph = new ReportGenerationGraph(provider as unknown as OllamaProvider);

    await expect(
      graph.run({
        reportId: "00000000-0000-4000-8000-000000000000",
        userId: "11111111-1111-4111-8111-111111111111",
        topic: "AI coding assistants",
      }),
    ).resolves.toEqual(generatedReport);

    expect(provider.generate).toHaveBeenCalledWith(
      expect.stringContaining("AI coding assistants"),
      expect.anything(),
    );
  });
});
