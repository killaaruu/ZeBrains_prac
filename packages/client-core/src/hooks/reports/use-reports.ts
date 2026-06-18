import type { Report } from "@repo/shared";
import { useQuery } from "@tanstack/react-query";
import { reportKeys } from "./keys";

interface UseReportsOptions {
  fetcher: () => Promise<Report[]>;
  enabled?: boolean;
}

export function useReports({ fetcher, enabled }: UseReportsOptions) {
  return useQuery({
    queryKey: reportKeys.list(),
    queryFn: fetcher,
    enabled,
  });
}
