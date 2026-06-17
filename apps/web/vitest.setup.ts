import * as matchers from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";
import { afterEach, expect, vi } from "vitest";

expect.extend(matchers);

// Polyfill ResizeObserver for jsdom (used by Radix ScrollArea)
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

// Set environment variables
process.env.VITE_SUPABASE_URL = "https://test.supabase.co";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "test-key";
process.env.VITE_API_URL = "http://localhost:3111";

afterEach(() => {
  cleanup();
});
