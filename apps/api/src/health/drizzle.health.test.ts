import { HealthCheckError } from "@nestjs/terminus";
import type { DrizzleDb } from "@repo/db-backend";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DrizzleHealthIndicator } from "./drizzle.health";

describe("DrizzleHealthIndicator", () => {
  let indicator: DrizzleHealthIndicator;
  let mockDb: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockDb = { execute: vi.fn() };
    indicator = new DrizzleHealthIndicator(mockDb as unknown as DrizzleDb);
  });

  it("returns up when SELECT 1 succeeds", async () => {
    mockDb.execute.mockResolvedValue([{ "?column?": 1 }]);

    const result = await indicator.isHealthy("database");

    expect(result).toEqual({ database: { status: "up" } });
  });

  it("throws HealthCheckError when query fails", async () => {
    mockDb.execute.mockRejectedValue(new Error("connection refused"));

    await expect(indicator.isHealthy("database")).rejects.toThrow(HealthCheckError);
  });
});
