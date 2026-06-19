import type { IRealtimeService } from "@repo/services-client";
import type { Report } from "@repo/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { reportKeys } from "./keys";

interface UseReportRealtimeOptions {
  reportId: string | null;
  realtimeService: IRealtimeService;
}

export function useReportRealtime({ reportId, realtimeService }: UseReportRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!reportId) {
      return;
    }

    return realtimeService.subscribeToRow<Report>({
      table: "reports",
      column: "id",
      value: reportId,
      onData: ({ event, new: nextReport, old }) => {
        const previousId = old?.id ?? reportId;

        if (event === "DELETE") {
          queryClient.removeQueries({ queryKey: reportKeys.detail(previousId), exact: true });
          queryClient.setQueryData<Report[] | undefined>(reportKeys.list(), (current) =>
            current?.filter((report) => report.id !== previousId),
          );
          return;
        }

        if (!nextReport) {
          return;
        }

        queryClient.setQueryData(reportKeys.detail(nextReport.id), nextReport);
        queryClient.setQueryData<Report[] | undefined>(reportKeys.list(), (current) => {
          if (!current) {
            return current;
          }

          const index = current.findIndex((report) => report.id === nextReport.id);
          if (index === -1) {
            return [nextReport, ...current];
          }

          return current.map((report) => (report.id === nextReport.id ? nextReport : report));
        });
      },
      onError: () => {
        void queryClient.invalidateQueries({ queryKey: reportKeys.detail(reportId) });
      },
    });
  }, [queryClient, realtimeService, reportId]);
}
