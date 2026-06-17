import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    testTimeout: 20000,
  },
  resolve: {
    // react/react-dom are peer deps (web 19.2 vs mobile 19.1), so multiple physical
    // copies can exist in the workspace. dedupe forces a SINGLE instance at test time —
    // otherwise react-dom sets the hook dispatcher on one copy while the hook reads
    // useState from another, yielding "Cannot read properties of null (reading 'useState')"
    // in whichever test file imports @testing-library/react before a react-loading dep.
    dedupe: ["react", "react-dom"],
  },
});
