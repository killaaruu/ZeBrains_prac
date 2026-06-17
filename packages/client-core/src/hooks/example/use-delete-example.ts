import { useMutation, useQueryClient } from "@tanstack/react-query";
import { exampleKeys } from "./keys";

interface UseDeleteExampleOptions {
  mutationFn: (id: string) => Promise<void>;
}

export function useDeleteExample({ mutationFn }: UseDeleteExampleOptions) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exampleKeys.all });
    },
  });
}
