import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DirectionProvider } from "@/shared/context/direction-provider";
import { FontProvider } from "@/shared/context/font-provider";
import { ThemeProvider } from "@/shared/context/theme-provider";
import { AuthProvider } from "@/shared/providers/auth-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <FontProvider>
          <DirectionProvider>
            <AuthProvider>{children}</AuthProvider>
          </DirectionProvider>
        </FontProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
