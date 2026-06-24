import type { ExampleEntity } from "@repo/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { exampleKeys } from "./keys";
import { useExample } from "./use-example";

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

const entity: ExampleEntity = {
  id: "550e8400-e29b-41d4-a716-446655440030",
  name: "Single",
  description: null,
  createdAt: "2026-06-17T12:00:00.000Z",
  updatedAt: "2026-06-17T12:00:00.000Z",
};

describe("useExample", () => {
  it("loads a single example by id with the detail query key", async () => {
    const fetcher = vi.fn().mockResolvedValue(entity);
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useExample({ id: entity.id, fetcher }), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(entity);
    });

    expect(fetcher).toHaveBeenCalledWith(entity.id);
    expect(
      queryClient.getQueryCache().find({ queryKey: exampleKeys.detail(entity.id) }),
    ).toBeDefined();
  });

  it("does not fetch when disabled", () => {
    const fetcher = vi.fn().mockResolvedValue(entity);
    const { wrapper } = createWrapper();
    renderHook(() => useExample({ id: entity.id, fetcher, enabled: false }), { wrapper });

    expect(fetcher).not.toHaveBeenCalled();
  });
});
