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
    // A missing/forbidden report (4xx) will never succeed on retry — fail fast so
    // a stale reportId doesn't spam the network with retries.
    retry: (failureCount, error) => {
      const status = (error as { status?: number } | null)?.status;
      if (typeof status === "number" && status >= 400 && status < 500) return false;
      return failureCount < 3;
    },
  });
}
