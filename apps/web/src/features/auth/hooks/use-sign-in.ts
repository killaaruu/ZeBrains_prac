import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { authService } from "@/shared/lib/supabase";
import { useAuthStore } from "@/shared/stores/auth-store";

interface UseSignInOptions {
  redirectTo?: string;
  returnUrl?: string;
}

function getAllowedReturnOrigins(): string[] {
  const raw = import.meta.env.VITE_ALLOWED_RETURN_ORIGINS ?? "";
  return raw
    .split(",")
    .map((o: string) => o.trim())
    .filter((o: string) => o.length > 0);
}

function buildReturnRedirect(
  returnUrl: string,
  accessToken: string,
  refreshToken: string,
): string | null {
  let url: URL;
  try {
    url = new URL(returnUrl);
  } catch {
    return null;
  }
  if (!getAllowedReturnOrigins().includes(url.origin)) {
    return null;
  }
  url.hash = `access_token=${encodeURIComponent(accessToken)}&refresh_token=${encodeURIComponent(refreshToken)}&type=magiclink`;
  return url.toString();
}

export function useSignIn(options?: UseSignInOptions) {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return authService.signIn(email, password);
    },
    onSuccess: async (user) => {
      setUser(user);

      if (options?.returnUrl) {
        const session = await authService.getSession();
        if (session?.accessToken && session?.refreshToken) {
          const redirect = buildReturnRedirect(
            options.returnUrl,
            session.accessToken,
            session.refreshToken,
          );
          if (redirect) {
            window.location.href = redirect;
            return;
          }
        }
      }

      navigate({ to: options?.redirectTo ?? "/" });
    },
  });
}
