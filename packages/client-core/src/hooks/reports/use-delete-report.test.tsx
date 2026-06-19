import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { reportKeys } from "./keys";
import { useDeleteReport } from "./use-delete-report";

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

describe("useDeleteReport", () => {
  it("deletes a report and invalidates report queries", async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useDeleteReport({ mutationFn }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("report-123");
    });

    expect(mutationFn).toHaveBeenCalledWith(
      "report-123",
      expect.objectContaining({ client: expect.any(QueryClient) }),
    );
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: reportKeys.all });
    });
  });
});
