import { Logger } from "@nestjs/common";
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
    private edges = new Map<string, string>();

    addNode(name: string, handler: (state: unknown) => unknown) {
      this.nodes.set(name, handler);
      return this;
    }

    addEdge(from: string, to: string) {
      this.edges.set(from, to);
      return this;
    }

    compile() {
      return {
        invoke: async (input: unknown) => {
          let current = "__start__";
          let state = { ...((input ?? {}) as object) };

          while (current !== "__end__") {
            const next = this.edges.get(current);

            if (!next || next === "__end__") {
              break;
            }

            const node = this.nodes.get(next);

            if (!node) {
              throw new Error(`Missing mock node: ${next}`);
            }

            const result = await node(state);
            state = { ...state, ...((result ?? {}) as object) };
            current = next;
          }

          return state;
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
  it("runs the full report graph and logs the assembled JSON", async () => {
    const loggerSpy = vi.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    const provider = {
      generate: vi
        .fn()
        .mockResolvedValueOnce(["AI coding assistants market", "AI coding assistants Russia"])
        .mockResolvedValueOnce([
          {
            title: "GitHub Copilot momentum",
            url: "https://example.com/copilot",
            snippet: "Global usage continues to grow.",
          },
          {
            title: "Invalid source",
            url: "not-a-url",
            snippet: "This source should be dropped by validation.",
          },
        ])
        .mockResolvedValueOnce({
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
        })
        .mockResolvedValueOnce({
          score: 7,
          arguments_for: ["Strong enterprise demand"],
          arguments_against: ["Quality depends on source material"],
        })
        .mockResolvedValueOnce(generatedReport),
    };

    const graph = new ReportGenerationGraph(provider as unknown as OllamaProvider);

    await expect(
      graph.run({
        reportId: "00000000-0000-4000-8000-000000000000",
        userId: "11111111-1111-4111-8111-111111111111",
        topic: "AI coding assistants",
      }),
    ).resolves.toEqual(generatedReport);

    expect(provider.generate).toHaveBeenCalledTimes(5);
    expect(provider.generate).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("Planner"),
      expect.anything(),
    );
    expect(provider.generate).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("AI coding assistants market"),
      expect.anything(),
    );
    expect(provider.generate).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("https://example.com/copilot"),
      expect.anything(),
    );
    expect(provider.generate).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining("global_market"),
      expect.anything(),
    );
    expect(provider.generate).toHaveBeenNthCalledWith(
      5,
      expect.stringContaining('"score":7'),
      expect.anything(),
    );
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('"trend_name":"AI coding assistants"'),
    );
  });
});
