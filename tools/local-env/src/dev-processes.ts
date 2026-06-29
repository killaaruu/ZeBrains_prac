export type DevProcessSpec = {
  command: string[];
  envScope: "api" | "web";
  label: "api" | "worker" | "web";
};

export function buildApiDevCommand(): string[] {
  return ["pnpm", "--filter", "@repo/api", "dev"];
}

export function buildWorkerDevCommand(): string[] {
  return ["pnpm", "--filter", "@repo/api", "dev:worker"];
}

export function buildWebDevCommand(port: string): string[] {
  return ["pnpm", "--filter", "@repo/web", "dev", "--host", "127.0.0.1", "--port", port];
}

export function buildDevProcessSpecs(webPort: string): DevProcessSpec[] {
  return [
    {
      command: buildApiDevCommand(),
      envScope: "api",
      label: "api",
    },
    {
      command: buildWorkerDevCommand(),
      envScope: "api",
      label: "worker",
    },
    {
      command: buildWebDevCommand(webPort),
      envScope: "web",
      label: "web",
    },
  ];
}
