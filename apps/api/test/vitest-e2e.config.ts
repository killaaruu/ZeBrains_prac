import swc from "unplugin-swc";
import { defineConfig, type Plugin } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.e2e-spec.ts"],
    globals: true,
    environment: "node",
    fileParallelism: false,
    maxWorkers: 1,
    pool: "threads",
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test_e2e",
      MIGRATIONS_DIR: process.env.MIGRATIONS_DIR ?? "../../packages/db-backend/src/migrations",
    },
  },
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }) as Plugin,
  ],
});
