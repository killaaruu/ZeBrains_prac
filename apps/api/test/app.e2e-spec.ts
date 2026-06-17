import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";

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
    NestFactory: {
      create: vi.fn(),
    },
  };
});

vi.mock("dotenv/config", () => ({}));

vi.mock("../src/app.module", () => ({
  AppModule: class AppModule {},
}));

describe("bootstrap", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("listens on PORT env var when set", async () => {
    process.env.PORT = "4000";

    const mockApp = {
      enableCors: vi.fn(),
      useGlobalInterceptors: vi.fn(),
      useGlobalFilters: vi.fn(),
      get: vi.fn().mockReturnValue({}),
      listen: vi.fn().mockResolvedValue(undefined),
      getUrl: vi.fn().mockResolvedValue("http://localhost:4000"),
    };

    const { NestFactory } = await import("@nestjs/core");
    vi.mocked(NestFactory.create).mockResolvedValue(mockApp as never);

    const { bootstrap } = await import("../src/bootstrap");
    await bootstrap();

    expect(mockApp.listen).toHaveBeenCalledWith(4000, "0.0.0.0");

    delete process.env.PORT;
  });

  it("defaults to port 3111 when PORT is not set", async () => {
    delete process.env.PORT;

    const mockApp = {
      enableCors: vi.fn(),
      useGlobalInterceptors: vi.fn(),
      useGlobalFilters: vi.fn(),
      get: vi.fn().mockReturnValue({}),
      listen: vi.fn().mockResolvedValue(undefined),
      getUrl: vi.fn().mockResolvedValue("http://localhost:3111"),
    };

    const { NestFactory } = await import("@nestjs/core");
    vi.mocked(NestFactory.create).mockResolvedValue(mockApp as never);

    const { bootstrap } = await import("../src/bootstrap");
    await bootstrap();

    expect(mockApp.listen).toHaveBeenCalledWith(3111, "0.0.0.0");
  });
});
