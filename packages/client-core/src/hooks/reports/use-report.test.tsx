import { type Report, ruMarketNotFound } from "@repo/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { reportKeys } from "./keys";
import { useReport } from "./use-report";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

const report: Report = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  userId: "user-1",
  topic: "Open source LLMs",
  status: "done",
  result: {
    trend_name: "Open source LLMs",
    global_market: [
      {
        product: "Local inference",
        company: "Ollama",
        effects: "Faster experimentation",
        sources: ["https://example.com/ollama"],
      },
    ],
    ru_market: ruMarketNotFound,
    sustainability: {
      score: 7,
      arguments_for: ["Active adoption"],
      arguments_against: ["GPU costs"],
    },
  },
  error: null,
  createdAt: "2026-06-17T12:00:00.000Z",
  updatedAt: "2026-06-17T12:10:00.000Z",
};

describe("useReport", () => {
  it("loads a single report by id with the detail query key", async () => {
    const fetcher = vi.fn().mockResolvedValue(report);
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useReport({ id: report.id, fetcher }), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(report);
    });

    expect(fetcher).toHaveBeenCalledWith(report.id);
    expect(
      queryClient.getQueryCache().find({ queryKey: reportKeys.detail(report.id) }),
    ).toBeDefined();
  });
});
