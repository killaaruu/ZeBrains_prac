import type { ExampleEntity, UpdateExampleEntity } from "@repo/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { exampleKeys } from "./keys";

interface UpdateExampleVariables {
  id: string;
  input: UpdateExampleEntity;
}

interface UseUpdateExampleOptions {
  mutationFn: (variables: UpdateExampleVariables) => Promise<ExampleEntity>;
}

export function useUpdateExample({ mutationFn }: UseUpdateExampleOptions) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: exampleKeys.all });
      queryClient.invalidateQueries({ queryKey: exampleKeys.detail(variables.id) });
    },
  });
}
