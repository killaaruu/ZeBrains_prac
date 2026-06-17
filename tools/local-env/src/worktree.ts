import { createHash } from "node:crypto";

export function deriveWorktreeId(worktreePath: string): string {
  return createHash("sha256").update(worktreePath).digest("hex").slice(0, 10);
}

export function buildComposeProjectName(worktreeId: string): string {
  const safeId = worktreeId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10);
  return `app-local-${safeId}`;
}
