import { createServer } from "node:net";

export async function findAvailablePort(startPort: number, host = "127.0.0.1"): Promise<number> {
  let port = startPort;

  while (!(await isPortAvailable(port, host))) {
    port += 1;
  }

  return port;
}

async function isPortAvailable(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once("error", () => resolve(false));
    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

export type LocalPorts = {
  apiPort: number;
  webPort: number;
  postgresPort: number;
  redisPort: number;
};

export function buildPortBases(worktreeId: string): LocalPorts {
  const offset = Number.parseInt(worktreeId.slice(0, 8), 16) % 1_000;

  return {
    apiPort: 31_000 + offset,
    webPort: 32_000 + offset,
    postgresPort: 34_000 + offset,
    redisPort: 35_000 + offset,
  };
}

export async function allocateLocalPorts(worktreeId: string): Promise<LocalPorts> {
  const bases = buildPortBases(worktreeId);
  const apiPort = await findAvailablePort(bases.apiPort);
  const webPort = await findAvailablePort(bases.webPort);
  const postgresPort = await findAvailablePort(bases.postgresPort);
  const redisPort = await findAvailablePort(bases.redisPort);

  return { apiPort, webPort, postgresPort, redisPort };
}
