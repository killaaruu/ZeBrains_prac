import type { CreateExampleEntity, ExampleEntity } from "@repo/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { exampleKeys } from "./keys";

interface UseCreateExampleOptions {
  mutationFn: (input: CreateExampleEntity) => Promise<ExampleEntity>;
}

export function useCreateExample({ mutationFn }: UseCreateExampleOptions) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: exampleKeys.all });
    },
  });
}
