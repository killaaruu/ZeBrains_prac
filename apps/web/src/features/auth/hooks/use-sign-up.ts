import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { authService } from "@/shared/lib/supabase";
import { useAuthStore } from "@/shared/stores/auth-store";

export function useSignUp() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return authService.signUp(email, password);
    },
    onSuccess: (user) => {
      setUser(user);
      navigate({ to: "/" });
    },
  });
}
