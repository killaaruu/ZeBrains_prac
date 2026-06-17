import { describe, expect, it } from "vitest";
import { resolveRepoRoot } from "./repo-root";

describe("resolveRepoRoot", () => {
  it("prefers pnpm INIT_CWD over the package script cwd", () => {
    expect(
      resolveRepoRoot({
        cwd: "/repo/tools/local-env",
        env: { INIT_CWD: "/repo" },
      }),
    ).toBe("/repo");
  });
});
