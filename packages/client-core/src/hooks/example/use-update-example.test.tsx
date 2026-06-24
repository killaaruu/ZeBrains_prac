import type { ExampleEntity, UpdateExampleEntity } from "@repo/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { exampleKeys } from "./keys";
import { useUpdateExample } from "./use-update-example";

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

const updated: ExampleEntity = {
  id: "550e8400-e29b-41d4-a716-446655440020",
  name: "Renamed",
  description: "now described",
  createdAt: "2026-06-17T12:00:00.000Z",
  updatedAt: "2026-06-17T12:30:00.000Z",
};

describe("useUpdateExample", () => {
  it("updates an example and invalidates both the list and the detail key", async () => {
    const mutationFn = vi.fn().mockResolvedValue(updated);
    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useUpdateExample({ mutationFn }), { wrapper });

    const input: UpdateExampleEntity = { name: "Renamed", description: "now described" };
    const variables = { id: updated.id, input };

    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(mutationFn).toHaveBeenCalledWith(
      variables,
      expect.objectContaining({ client: expect.any(QueryClient) }),
    );
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: exampleKeys.all });
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: exampleKeys.detail(updated.id),
    });
  });
});
