import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RuntimeEnv } from "./env";
import type { LocalPorts } from "./ports";

export type LocalState = {
  mode: "dev" | "e2e" | "light";
  projectName: string;
  ports: LocalPorts;
  urls: {
    api: string;
    web: string;
  };
};

export async function writeLocalState(
  rootDir: string,
  state: LocalState,
  runtimeEnv: RuntimeEnv,
): Promise<void> {
  const stateDir = join(rootDir, ".local-env");
  await mkdir(stateDir, { recursive: true });

  await Promise.all([
    writeFile(join(stateDir, `${state.mode}.json`), `${JSON.stringify(state, null, 2)}\n`),
    writeFile(join(stateDir, `${state.mode}.api.env`), serializeEnv(runtimeEnv.api)),
    writeFile(join(stateDir, `${state.mode}.web.env`), serializeEnv(runtimeEnv.web)),
  ]);
}

function serializeEnv(values: Record<string, string>): string {
  return `${Object.entries(values)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n")}\n`;
}
