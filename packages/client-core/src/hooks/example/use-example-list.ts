import type { ExampleEntity } from "@repo/shared";
import { useQuery } from "@tanstack/react-query";
import { type ExampleListParams, exampleKeys } from "./keys";

export interface ExampleListResult {
  items: ExampleEntity[];
  total: number;
}

interface UseExampleListOptions {
  fetcher: (params: ExampleListParams) => Promise<ExampleListResult>;
  params?: ExampleListParams;
  enabled?: boolean;
}

export function useExampleList({ fetcher, params, enabled }: UseExampleListOptions) {
  return useQuery({
    queryKey: exampleKeys.list(params),
    queryFn: () => fetcher(params ?? {}),
    enabled,
  });
}
