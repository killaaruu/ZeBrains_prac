import type { Report } from "@repo/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { reportKeys } from "./keys";
import { useReports } from "./use-reports";

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
  id: "550e8400-e29b-41d4-a716-446655440000",
  userId: "user-1",
  topic: "AI coding assistants",
  status: "queued",
  result: null,
  error: null,
  createdAt: "2026-06-17T12:00:00.000Z",
  updatedAt: "2026-06-17T12:00:00.000Z",
};

describe("useReports", () => {
  it("loads the current user's reports with the reports list query key", async () => {
    const fetcher = vi.fn().mockResolvedValue([report]);
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useReports({ fetcher }), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual([report]);
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(queryClient.getQueryCache().find({ queryKey: reportKeys.list() })).toBeDefined();
  });

  it("sorts reports newest first before exposing them to consumers", async () => {
    const olderReport: Report = {
      ...report,
      id: "550e8400-e29b-41d4-a716-446655440001",
      topic: "Older trend",
      createdAt: "2026-06-16T12:00:00.000Z",
      updatedAt: "2026-06-16T12:00:00.000Z",
    };
    const newerReport: Report = {
      ...report,
      id: "550e8400-e29b-41d4-a716-446655440002",
      topic: "Newer trend",
      createdAt: "2026-06-18T12:00:00.000Z",
      updatedAt: "2026-06-18T12:00:00.000Z",
    };
    const fetcher = vi.fn().mockResolvedValue([olderReport, newerReport]);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useReports({ fetcher }), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual([newerReport, olderReport]);
    });
  });
});
