const path = require("node:path");
const nodeExternals = require("webpack-node-externals");

module.exports = (options) => ({
  ...options,
  // Poll for file changes so docker compose watch works on macOS (inotify doesn't cross the VM boundary)
  watchOptions: { poll: 1000, ignored: /node_modules/ },
  entry: {
    main: options.entry,
    migrate: "./src/migrate.ts",
  },
  output: {
    ...options.output,
    filename: "[name].js",
  },
  externals: [
    nodeExternals({
      // Bundle workspace packages so ts-loader compiles their TypeScript source.
      // All other node_modules remain external (loaded at runtime via require).
      allowlist: [/^@repo\//],
      // pnpm hoists deps to root node_modules — scan it too
      additionalModuleDirs: [path.resolve(__dirname, "../../node_modules")],
    }),
  ],
});
