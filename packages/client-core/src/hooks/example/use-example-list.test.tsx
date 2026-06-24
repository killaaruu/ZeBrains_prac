import type { ExampleEntity } from "@repo/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { exampleKeys } from "./keys";
import { type ExampleListResult, useExampleList } from "./use-example-list";

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

const listResult: ExampleListResult = {
  items: [
    {
      id: "550e8400-e29b-41d4-a716-446655440040",
      name: "First",
      description: null,
      createdAt: "2026-06-17T12:00:00.000Z",
      updatedAt: "2026-06-17T12:00:00.000Z",
    } satisfies ExampleEntity,
  ],
  total: 1,
};

describe("useExampleList", () => {
  it("loads the list and caches it under the list query key for the given params", async () => {
    const params = { limit: 10 };
    const fetcher = vi.fn().mockResolvedValue(listResult);
    const { queryClient, wrapper } = createWrapper();
    const { result } = renderHook(() => useExampleList({ fetcher, params }), { wrapper });

    await waitFor(() => {
      expect(result.current.data).toEqual(listResult);
    });

    expect(fetcher).toHaveBeenCalledWith(params);
    expect(queryClient.getQueryCache().find({ queryKey: exampleKeys.list(params) })).toBeDefined();
  });

  it("passes an empty object to the fetcher when no params are given", async () => {
    const fetcher = vi.fn().mockResolvedValue(listResult);
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useExampleList({ fetcher }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(fetcher).toHaveBeenCalledWith({});
  });

  it("does not fetch when disabled", () => {
    const fetcher = vi.fn().mockResolvedValue(listResult);
    const { wrapper } = createWrapper();
    renderHook(() => useExampleList({ fetcher, enabled: false }), { wrapper });

    expect(fetcher).not.toHaveBeenCalled();
  });
});
