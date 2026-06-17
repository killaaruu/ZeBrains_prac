import type { ExampleEntity } from "@repo/shared";
import { useQuery } from "@tanstack/react-query";
import { exampleKeys } from "./keys";

interface UseExampleOptions {
  id: string;
  fetcher: (id: string) => Promise<ExampleEntity>;
  enabled?: boolean;
}

export function useExample({ id, fetcher, enabled }: UseExampleOptions) {
  return useQuery({
    queryKey: exampleKeys.detail(id),
    queryFn: () => fetcher(id),
    enabled,
  });
}
