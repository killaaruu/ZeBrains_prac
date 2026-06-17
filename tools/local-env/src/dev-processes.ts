export function buildWebDevCommand(port: string): string[] {
  return ["pnpm", "--filter", "@repo/web", "dev", "--host", "127.0.0.1", "--port", port];
}
