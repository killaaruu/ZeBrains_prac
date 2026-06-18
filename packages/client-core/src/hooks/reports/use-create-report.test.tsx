import type { CreateReport } from "@repo/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { reportKeys } from "./keys";
import { useCreateReport } from "./use-create-report";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");

  return {
    queryClient,
    invalidateQueries,
    wrapper: ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children),
  };
}

describe("useCreateReport", () => {
  it("creates a report and invalidates report queries", async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: "report-123" });
    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useCreateReport({ mutationFn }), { wrapper });

    const input: CreateReport = { topic: "AI coding assistants" };

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(mutationFn).toHaveBeenCalledWith(
      input,
      expect.objectContaining({ client: expect.any(QueryClient) }),
    );
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: reportKeys.all });
    });
  });
});
