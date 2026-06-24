import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { exampleKeys } from "./keys";
import { useDeleteExample } from "./use-delete-example";

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

describe("useDeleteExample", () => {
  it("deletes an example and invalidates the example list", async () => {
    const mutationFn = vi.fn().mockResolvedValue(undefined);
    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useDeleteExample({ mutationFn }), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("example-123");
    });

    expect(mutationFn).toHaveBeenCalledWith(
      "example-123",
      expect.objectContaining({ client: expect.any(QueryClient) }),
    );
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: exampleKeys.all });
    });
  });
});
