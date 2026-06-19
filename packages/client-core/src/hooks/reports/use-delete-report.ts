import { useMutation, useQueryClient } from "@tanstack/react-query";
import { reportKeys } from "./keys";

interface UseDeleteReportOptions {
  mutationFn: (id: string) => Promise<void>;
}

export function useDeleteReport({ mutationFn }: UseDeleteReportOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: reportKeys.all });
    },
  });
}
