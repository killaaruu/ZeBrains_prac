import { resolve } from "node:path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: resolve(__dirname, "src/app/routes"),
      generatedRouteTree: resolve(__dirname, "src/app/routeTree.gen.ts"),
      quoteStyle: "double",
      routeFileIgnorePattern: "\\.(test|spec)\\.(ts|tsx)$|\\.d\\.ts$",
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    outDir: "dist",
  },
});
