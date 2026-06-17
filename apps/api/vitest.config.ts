import swc from "unplugin-swc";
import { defineConfig, type Plugin } from "vitest/config";

const testConfig = {
  globals: false,
  environment: "node",
  pool: "threads",
  isolate: false,
  maxWorkers: 1,
  fileParallelism: false,
  testTimeout: 20000,
  setupFiles: ["./vitest.setup.ts"],
  env: {
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  },
};

export default defineConfig({
  test: testConfig,
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }) as Plugin,
  ],
});
