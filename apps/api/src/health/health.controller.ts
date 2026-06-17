import { Controller, Get, Logger } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthCheck, HealthCheckService, MemoryHealthIndicator } from "@nestjs/terminus";
import { Public } from "../auth/decorators/public.decorator";
import { MetricsService } from "../common/metrics/metrics.service";
import { DrizzleHealthIndicator } from "./drizzle.health";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly drizzleHealth: DrizzleHealthIndicator,
    private readonly memory: MemoryHealthIndicator,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: "Health check (database + memory)" })
  check() {
    return this.health.check([
      () => this.drizzleHealth.isHealthy("database"),
      () => this.memory.checkHeap("memory_heap", 256 * 1024 * 1024),
    ]);
  }

  @Get("metrics")
  @Public()
  @ApiOperation({ summary: "Process and application metrics" })
  metrics() {
    return {
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      application: this.metricsService.getSnapshot(),
    };
  }

  @Get("readiness")
  @Public()
  @ApiOperation({ summary: "Readiness probe (health + metrics)" })
  async readiness() {
    try {
      const health = await this.health.check([
        () => this.drizzleHealth.isHealthy("database"),
        () => this.memory.checkHeap("memory_heap", 256 * 1024 * 1024),
      ]);

      return {
        status: "ready",
        health,
        metrics: this.metricsService.getSnapshot(),
      };
    } catch (error) {
      this.logger.warn(`Readiness check failed: ${error instanceof Error ? error.message : error}`);
      return {
        status: "not-ready",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
