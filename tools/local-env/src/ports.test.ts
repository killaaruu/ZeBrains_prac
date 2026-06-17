import { createServer } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { buildPortBases, findAvailablePort } from "./ports";

const servers: Array<{ close: () => Promise<void> }> = [];

async function occupyPort(port: number): Promise<void> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
  servers.push({
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  });
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("findAvailablePort", () => {
  it("skips occupied ports and returns the next available port", async () => {
    await occupyPort(43111);

    await expect(findAvailablePort(43111, "127.0.0.1")).resolves.toBe(43112);
  });
});

describe("buildPortBases", () => {
  it("uses a high worktree-derived range instead of common default ports", () => {
    expect(buildPortBases("abcdef1234")).toEqual({
      apiPort: 31_018,
      webPort: 32_018,
      postgresPort: 34_018,
      redisPort: 35_018,
    });
  });
});
