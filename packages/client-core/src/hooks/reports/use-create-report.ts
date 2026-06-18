import type { CreateReport } from "@repo/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reportKeys } from "./keys";

interface UseCreateReportOptions {
  mutationFn: (input: CreateReport) => Promise<{ id: string }>;
}

export function useCreateReport({ mutationFn }: UseCreateReportOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}
