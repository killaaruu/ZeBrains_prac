import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { ClsService } from "nestjs-cls";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@repo/db-backend", () => ({
  db: {},
}));

function getMockQueueToken(name: string) {
  return `BullQueue_${name}`;
}

function createMockQueue() {
  return {
    add: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    getJob: vi.fn(),
    off: vi.fn(),
    on: vi.fn(),
    removeListener: vi.fn(),
  };
}

function createMockQueueModule(options: { name: string } | Array<{ name: string }>) {
  const queues = Array.isArray(options) ? options : [options];
  const providers = queues.map((queue) => ({
    provide: getMockQueueToken(queue.name),
    useFactory: createMockQueue,
  }));

  return {
    module: class MockBullQueueModule {},
    providers,
    exports: providers.map((provider) => provider.provide),
  };
}

vi.mock("@nestjs/bullmq", async () => {
  const { Inject } = await vi.importActual<typeof import("@nestjs/common")>("@nestjs/common");

  return {
    BullModule: {
      forRootAsync: () => ({ module: class MockBullRootModule {} }),
      registerQueue: createMockQueueModule,
      registerQueueAsync: createMockQueueModule,
    },
    InjectQueue: (name: string) => Inject(getMockQueueToken(name)),
    Processor: () => (target: unknown) => target,
    WorkerHost: class MockWorkerHost {},
  };
});

vi.mock("@bull-board/api/bullMQAdapter", () => ({
  BullMQAdapter: class MockBullMQAdapter {},
}));

vi.mock("@bull-board/express", () => ({
  ExpressAdapter: class MockExpressAdapter {},
}));

vi.mock("@bull-board/nestjs", () => ({
  BullBoardModule: {
    forFeature: () => ({ module: class MockBullBoardFeatureModule {} }),
    forRoot: () => ({ module: class MockBullBoardRootModule {} }),
  },
}));

vi.mock("@langchain/langgraph", () => {
  const Annotation = () => ({});
  Annotation.Root = () => ({ State: {} });

  return {
    Annotation,
    END: "__end__",
    START: "__start__",
    StateGraph: class MockStateGraph {
      addNode() {
        return this;
      }

      addEdge() {
        return this;
      }

      compile() {
        return { invoke: vi.fn() };
      }
    },
  };
});

vi.mock("@nestjs/schedule", () => ({
  Cron: () => (_target: unknown, _propertyKey: string, _descriptor: PropertyDescriptor) => {},
  CronExpression: {
    EVERY_HOUR: "0 0 * * * *",
    EVERY_MINUTE: "*/60 * * * * *",
  },
  ScheduleModule: {
    forRoot: () => ({ module: class MockScheduleModule {} }),
  },
}));

import { AppModule } from "./app.module";
import { AuthModule } from "./auth/auth.module";
import { RequestContextModule } from "./common/context/request-context.module";
import { MetricsModule } from "./common/metrics/metrics.module";
import { HealthModule } from "./health/health.module";
import { ExampleModule } from "./modules/example/example.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { QueueModule } from "./queue/queue.module";
import { WorkerModule } from "./worker/worker.module";

// nestjs-cls v6 ClsRootModule always injects HttpAdapterHost which isn't available
// in Test.createTestingModule (no HTTP server). Replace RequestContextModule with a
// stub that provides ClsService without that dependency.
@Global()
@Module({
  providers: [
    {
      provide: ClsService,
      useValue: { get: vi.fn(), set: vi.fn(), run: vi.fn(), runAndPopulate: vi.fn() },
    },
    { provide: APP_INTERCEPTOR, useValue: {} },
  ],
  exports: [ClsService],
})
class MockRequestContextModule {}

function configModule() {
  return ConfigModule.forRoot({ isGlobal: true });
}

/**
 * Module DI compilation tests.
 *
 * These tests verify that every NestJS module compiles without
 * UnknownDependenciesException errors (caused by `import type` for
 * injectable classes, missing injection tokens for interfaces, or
 * unregistered providers).
 *
 * Requires SWC (via unplugin-swc in vitest.config.ts) to properly
 * emit decorator metadata — without it, NestJS can't resolve
 * constructor parameter types and tests give false positives.
 */
describe("Module DI compilation", () => {
  let appModule: any;

  beforeAll(async () => {
    appModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // nestjs-cls v6 ClsRootModule always injects HttpAdapterHost (unavailable in
      // Test.createTestingModule — no HTTP server). Override the whole module to avoid
      // the dependency without touching production code.
      .overrideModule(RequestContextModule)
      .useModule(MockRequestContextModule)
      .compile();
  });

  afterAll(async () => {
    if (appModule) {
      await appModule.close();
    }
  });

  it("AuthModule compiles without DI errors", async () => {
    const module = await Test.createTestingModule({
      imports: [configModule(), AuthModule],
    }).compile();

    expect(module).toBeDefined();
    await module.close();
  });

  it("HealthModule compiles without DI errors", async () => {
    const module = await Test.createTestingModule({
      imports: [configModule(), MetricsModule, HealthModule],
    }).compile();

    expect(module).toBeDefined();
    await module.close();
  });

  it("QueueModule compiles without DI errors", async () => {
    const module = await Test.createTestingModule({
      imports: [configModule(), QueueModule],
    }).compile();

    expect(module).toBeDefined();
    await module.close();
  });

  it("ExampleModule compiles without DI errors", async () => {
    const module = await Test.createTestingModule({
      imports: [configModule(), ExampleModule],
    }).compile();

    expect(module).toBeDefined();
    await module.close();
  });

  it("ReportsModule compiles without DI errors", async () => {
    const module = await Test.createTestingModule({
      imports: [configModule(), ReportsModule],
    }).compile();

    expect(module).toBeDefined();
    await module.close();
  });

  it("WorkerModule compiles without DI errors", async () => {
    const module = await Test.createTestingModule({
      imports: [configModule(), WorkerModule],
    }).compile();

    expect(module).toBeDefined();
    await module.close();
  });

  it("AppModule compiles without DI errors (transitive verification of all submodules)", () => {
    expect(appModule).toBeDefined();
  });
});
