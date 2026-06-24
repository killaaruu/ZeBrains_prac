import type { CreateExampleEntity, ExampleEntity } from "@repo/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { exampleKeys } from "./keys";
import { useCreateExample } from "./use-create-example";

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

const created: ExampleEntity = {
  id: "550e8400-e29b-41d4-a716-446655440010",
  name: "Widget",
  description: null,
  createdAt: "2026-06-17T12:00:00.000Z",
  updatedAt: "2026-06-17T12:00:00.000Z",
};

describe("useCreateExample", () => {
  it("creates an example and invalidates the example list", async () => {
    const mutationFn = vi.fn().mockResolvedValue(created);
    const { wrapper, invalidateQueries } = createWrapper();
    const { result } = renderHook(() => useCreateExample({ mutationFn }), { wrapper });

    const input: CreateExampleEntity = { name: "Widget" };

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(mutationFn).toHaveBeenCalledWith(
      input,
      expect.objectContaining({ client: expect.any(QueryClient) }),
    );
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: exampleKeys.all });
    });
  });
});
