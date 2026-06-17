import type { HealthCheckService, MemoryHealthIndicator } from "@nestjs/terminus";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetricsService } from "../common/metrics/metrics.service";
import type { DrizzleHealthIndicator } from "./drizzle.health";
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  let controller: HealthController;
  let healthCheckService: { check: ReturnType<typeof vi.fn> };
  let drizzleHealth: { isHealthy: ReturnType<typeof vi.fn> };
  let memoryHealth: { checkHeap: ReturnType<typeof vi.fn> };
  let metricsService: MetricsService;

  beforeEach(() => {
    healthCheckService = { check: vi.fn() };
    drizzleHealth = { isHealthy: vi.fn() };
    memoryHealth = { checkHeap: vi.fn() };
    metricsService = new MetricsService();

    controller = new HealthController(
      healthCheckService as unknown as HealthCheckService,
      drizzleHealth as unknown as DrizzleHealthIndicator,
      memoryHealth as unknown as MemoryHealthIndicator,
      metricsService,
    );
  });

  describe("check", () => {
    it("returns health check result from terminus", async () => {
      const expected = {
        status: "ok",
        info: { database: { status: "up" }, memory_heap: { status: "up" } },
      };
      healthCheckService.check.mockResolvedValue(expected);

      const result = await controller.check();

      expect(result).toEqual(expected);
      expect(healthCheckService.check).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Function), expect.any(Function)]),
      );
    });
  });

  describe("metrics", () => {
    it("returns process metrics with memoryUsage and uptime", () => {
      const result = controller.metrics();

      expect(result).toHaveProperty("memoryUsage");
      expect(result.memoryUsage).toHaveProperty("rss");
      expect(result.memoryUsage).toHaveProperty("heapTotal");
      expect(result.memoryUsage).toHaveProperty("heapUsed");
      expect(result).toHaveProperty("uptime");
      expect(result).toHaveProperty("timestamp");
      expect(typeof result.uptime).toBe("number");
    });

    it("includes application metrics from MetricsService", () => {
      metricsService.recordRequest("GET", "/example-entities", 200, 50);
      metricsService.recordRequest("POST", "/example-entities", 500, 100);

      const result = controller.metrics();

      expect(result).toHaveProperty("application");
      expect(result.application.totalRequests).toBe(2);
      expect(result.application.totalErrors).toBe(1);
      expect(result.application.avgResponseTimeMs).toBe(75);
      expect(result.application.errorsByStatus).toEqual({ 500: 1 });
    });
  });

  describe("readiness", () => {
    it("returns ready status with health and metrics", async () => {
      const healthResult = { status: "ok", info: { database: { status: "up" } } };
      healthCheckService.check.mockResolvedValue(healthResult);

      const result = await controller.readiness();

      expect(result).toHaveProperty("status", "ready");
      expect(result).toHaveProperty("health");
      expect(result).toHaveProperty("metrics");
    });

    it("returns not-ready when health check fails", async () => {
      healthCheckService.check.mockRejectedValue(new Error("db down"));

      const result = await controller.readiness();

      expect(result).toHaveProperty("status", "not-ready");
      expect(result).toHaveProperty("error", "db down");
    });
  });
});
