import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { GlobalExceptionFilter } from "../src/common/filters/http-exception.filter";
import { LoggingInterceptor } from "../src/common/interceptors/logging.interceptor";
import { MetricsModule } from "../src/common/metrics/metrics.module";
import { MetricsService } from "../src/common/metrics/metrics.service";
import { HealthModule } from "../src/health/health.module";

/** Mock DB that responds to basic queries */
export const mockDb = {
  execute: async () => [{ "?column?": 1 }],
  select: () => ({ from: () => ({ where: async () => [] }) }),
  insert: () => ({ values: async () => ({}) }),
  query: {},
};

/**
 * Create a lightweight test NestJS application with the health module.
 * Uses mocked DB to avoid requiring a real Postgres connection.
 */
export async function createHealthTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [MetricsModule, HealthModule],
  })
    .overrideProvider("DRIZZLE_DB")
    .useValue(mockDb)
    .compile();

  const app = moduleFixture.createNestApplication();
  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new LoggingInterceptor(metricsService));
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.init();

  return app;
}
