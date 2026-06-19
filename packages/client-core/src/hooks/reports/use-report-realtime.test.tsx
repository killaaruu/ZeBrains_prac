import type { IRealtimeService } from "@repo/services-client";
import { type Report, ruMarketNotFound } from "@repo/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { reportKeys } from "./keys";
import { useReportRealtime } from "./use-report-realtime";

const report: Report = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  userId: "user-1",
  topic: "Open source LLMs",
  status: "queued",
  result: null,
  error: null,
  createdAt: "2026-06-17T12:00:00.000Z",
  updatedAt: "2026-06-17T12:10:00.000Z",
};

const completedReport: Report = {
  ...report,
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
  updatedAt: "2026-06-17T12:15:00.000Z",
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  queryClient.setQueryData(reportKeys.list(), [report]);
  queryClient.setQueryData(reportKeys.detail(report.id), report);

  return {
    queryClient,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

describe("useReportRealtime", () => {
  it("subscribes to the current report and updates list/detail caches from realtime payloads", async () => {
    let onData:
      | ((payload: { new: Report | null; old: Partial<Report> | null }) => void)
      | undefined;
    const unsubscribe = vi.fn();
    const realtimeService: IRealtimeService = {
      subscribeToTable: vi.fn(),
      subscribeToFiltered: vi.fn(),
      subscribeToRow: vi.fn(({ onData: callback }) => {
        onData = callback;
        return unsubscribe;
      }),
      unsubscribeAll: vi.fn(),
    };

    const { queryClient, wrapper } = createWrapper();
    const rendered = renderHook(() => useReportRealtime({ reportId: report.id, realtimeService }), {
      wrapper,
    });

    if (!onData) {
      throw new Error("Expected realtime callback to be registered");
    }

    onData({ new: completedReport, old: report });

    await waitFor(() => {
      expect(queryClient.getQueryData(reportKeys.detail(report.id))).toEqual(completedReport);
      expect(queryClient.getQueryData(reportKeys.list())).toEqual([completedReport]);
    });

    expect(realtimeService.subscribeToRow).toHaveBeenCalledWith({
      table: "reports",
      column: "id",
      value: report.id,
      onData: expect.any(Function),
      onError: expect.any(Function),
    });

    rendered.unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
