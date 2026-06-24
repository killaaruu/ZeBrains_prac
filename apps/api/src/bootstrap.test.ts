import "reflect-metadata";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@nestjs/swagger", () => ({
  SwaggerModule: {
    createDocument: vi.fn().mockReturnValue({}),
    setup: vi.fn(),
  },
  DocumentBuilder: class {
    setTitle() {
      return this;
    }
    setDescription() {
      return this;
    }
    setVersion() {
      return this;
    }
    addBearerAuth() {
      return this;
    }
    build() {
      return {};
    }
  },
}));

vi.mock("@nestjs/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@nestjs/core")>();
  return {
    ...actual,
    NestFactory: { create: vi.fn() },
  };
});

vi.mock("dotenv/config", () => ({}));

// Skip the real DB migration step so the CORS config can be asserted without infra.
vi.mock("@repo/db-backend", () => ({ runMigrations: vi.fn().mockResolvedValue(undefined) }));

vi.mock("./app.module", () => ({ AppModule: class AppModule {} }));

function createMockApp() {
  return {
    enableCors: vi.fn(),
    useGlobalInterceptors: vi.fn(),
    useGlobalFilters: vi.fn(),
    get: vi.fn().mockReturnValue({}),
    listen: vi.fn().mockResolvedValue(undefined),
    getUrl: vi.fn().mockResolvedValue("http://localhost:3111"),
  };
}

describe("bootstrap CORS", () => {
  beforeEach(() => {
    process.env.API_SKIP_MIGRATIONS = "true";
  });

  afterEach(() => {
    delete process.env.API_SKIP_MIGRATIONS;
    vi.resetModules();
  });

  it("allows the ngrok-skip-browser-warning header so the tunnel bypass survives preflight", async () => {
    const mockApp = createMockApp();
    const { NestFactory } = await import("@nestjs/core");
    vi.mocked(NestFactory.create).mockResolvedValue(mockApp as never);

    const { bootstrap } = await import("./bootstrap");
    await bootstrap();

    const corsOptions = mockApp.enableCors.mock.calls[0]?.[0];
    expect(corsOptions.allowedHeaders).toContain("ngrok-skip-browser-warning");
  });

  it("matches both the production Vercel origin and generated preview subdomains", async () => {
    const mockApp = createMockApp();
    const { NestFactory } = await import("@nestjs/core");
    vi.mocked(NestFactory.create).mockResolvedValue(mockApp as never);

    const { bootstrap } = await import("./bootstrap");
    await bootstrap();

    const origins = mockApp.enableCors.mock.calls[0]?.[0].origin as Array<string | RegExp>;
    expect(origins).toContain("https://trendscout-stage.vercel.app");

    const previewMatcher = origins.find((entry): entry is RegExp => entry instanceof RegExp);
    expect(previewMatcher).toBeInstanceOf(RegExp);
    expect(previewMatcher?.test("https://trendscout-stage-abc123.vercel.app")).toBe(true);
    expect(previewMatcher?.test("https://evil.example.com")).toBe(false);
  });
});
