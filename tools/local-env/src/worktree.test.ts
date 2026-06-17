import { describe, expect, it } from "vitest";
import { buildComposeProjectName, deriveWorktreeId } from "./worktree";

describe("worktree identity", () => {
  it("derives stable ids from different worktree paths", () => {
    const first = deriveWorktreeId("/Users/dev/worktrees/e649/app");
    const second = deriveWorktreeId("/Users/dev/worktrees/a123/app");

    expect(first).toMatch(/^[a-z0-9]{10}$/);
    expect(second).toMatch(/^[a-z0-9]{10}$/);
    expect(first).not.toBe(second);
    expect(deriveWorktreeId("/Users/dev/worktrees/e649/app")).toBe(first);
  });

  it("builds docker compose safe project names", () => {
    expect(buildComposeProjectName("ABC_def-1234567890")).toBe("app-local-abcdef1234");
  });
});
