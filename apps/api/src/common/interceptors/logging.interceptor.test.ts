import { CallHandler, ExecutionContext, Logger } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetricsService } from "../metrics/metrics.service";
import { LoggingInterceptor } from "./logging.interceptor";

function makeContext(
  overrides: {
    method?: string;
    url?: string;
    ip?: string;
    statusCode?: number;
    requestId?: string;
  } = {},
): ExecutionContext {
  const request = {
    method: overrides.method ?? "GET",
    url: overrides.url ?? "/auth/me",
    ip: overrides.ip ?? "127.0.0.1",
    requestId: overrides.requestId,
  };
  const response = {
    statusCode: overrides.statusCode ?? 200,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function makeCallHandler(response: unknown): CallHandler {
  return { handle: () => of(response) };
}

function makeErrorCallHandler(error: Error): CallHandler {
  return { handle: () => throwError(() => error) };
}

describe("LoggingInterceptor", () => {
  let interceptor: LoggingInterceptor;
  let metricsService: MetricsService;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    metricsService = new MetricsService();
    interceptor = new LoggingInterceptor(metricsService);
    logSpy = vi.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    warnSpy = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
  });

  it("logs method, URL, status code, and duration on success", async () => {
    const ctx = makeContext({ method: "GET", url: "/auth/me", statusCode: 200 });
    const handler = makeCallHandler({ id: "user-1" });

    await new Promise((resolve) => {
      interceptor.intercept(ctx, handler).subscribe(resolve);
    });

    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/GET \/auth\/me 200 \d+ms/));
  });

  it("includes request ID in log when present", async () => {
    const ctx = makeContext({
      method: "GET",
      url: "/auth/me",
      statusCode: 200,
      requestId: "req-abc-123",
    });
    const handler = makeCallHandler({ ok: true });

    await new Promise((resolve) => {
      interceptor.intercept(ctx, handler).subscribe(resolve);
    });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("req-abc-123"));
  });

  it("logs on error and re-throws", async () => {
    const ctx = makeContext({ method: "POST", url: "/bot/conversations" });
    const error = new Error("boom");
    const handler = makeErrorCallHandler(error);

    let caughtError: Error | undefined;
    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, handler).subscribe({
        error: (err) => {
          caughtError = err;
          resolve();
        },
      });
    });

    expect(caughtError).toBe(error);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringMatching(/POST \/bot\/conversations .* \d+ms/),
    );
  });

  it("feeds metrics service on success", async () => {
    const recordSpy = vi.spyOn(metricsService, "recordRequest");
    const ctx = makeContext({ method: "GET", url: "/api/deals", statusCode: 200 });
    const handler = makeCallHandler([]);

    await new Promise((resolve) => {
      interceptor.intercept(ctx, handler).subscribe(resolve);
    });

    expect(recordSpy).toHaveBeenCalledWith("GET", "/api/deals", 200, expect.any(Number));
  });

  it("feeds metrics service on error", async () => {
    const recordSpy = vi.spyOn(metricsService, "recordRequest");
    const ctx = makeContext({ method: "POST", url: "/api/crash", statusCode: 200 });
    const error = Object.assign(new Error("fail"), { status: 500 });
    const handler = makeErrorCallHandler(error);

    await new Promise<void>((resolve) => {
      interceptor.intercept(ctx, handler).subscribe({
        error: () => resolve(),
      });
    });

    expect(recordSpy).toHaveBeenCalledWith("POST", "/api/crash", 500, expect.any(Number));
  });

  it("passes through response body untouched", async () => {
    const responseBody = { id: "row-1", name: "test" };
    const ctx = makeContext();
    const handler = makeCallHandler(responseBody);

    const result = await new Promise((resolve) => {
      interceptor.intercept(ctx, handler).subscribe(resolve);
    });

    expect(result).toEqual(responseBody);
  });
});
