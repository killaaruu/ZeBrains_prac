import type { Report } from "@repo/shared";
import { useQuery } from "@tanstack/react-query";
import { reportKeys } from "./keys";

interface UseReportOptions {
  id: string;
  fetcher: (id: string) => Promise<Report>;
  enabled?: boolean;
}

export function useReport({ id, fetcher, enabled }: UseReportOptions) {
  return useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: () => fetcher(id),
    enabled,
  });
}
