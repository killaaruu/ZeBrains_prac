import { useMutation } from "@tanstack/react-query";
import { authService } from "@/shared/lib/supabase";

export function useForgotPassword() {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      return authService.resetPassword(email);
    },
  });
}
