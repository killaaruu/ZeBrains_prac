import { useEffect } from "react";

export function HydrationWarningSuppressor() {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        const message = args[0];
        if (
          typeof message === "string" &&
          (message.includes("Hydration failed") ||
            message.includes("there was a mismatch") ||
            message.includes("did not match"))
        ) {
          return;
        }
        originalError.call(console, ...args);
      };
    }
  }, []);

  return null;
}

export function IDProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HydrationWarningSuppressor />
      {children}
    </>
  );
}
