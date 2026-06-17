import { type ArgumentsHost, HttpStatus, Logger, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalExceptionFilter } from "./http-exception.filter";

function makeHost(overrides: { method?: string; url?: string; requestId?: string } = {}) {
  const jsonFn = vi.fn().mockReturnThis();
  const statusFn = vi.fn().mockReturnValue({ json: jsonFn });
  const request = {
    method: overrides.method ?? "GET",
    url: overrides.url ?? "/test",
    requestId: overrides.requestId,
  };

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ status: statusFn }),
    }),
  } as unknown as ArgumentsHost;

  return { host, statusFn, jsonFn };
}

describe("GlobalExceptionFilter", () => {
  let filter: GlobalExceptionFilter;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    errorSpy = vi.spyOn(Logger.prototype, "error").mockImplementation(() => {});
  });

  it("catches HttpException and returns structured JSON", () => {
    const { host, statusFn, jsonFn } = makeHost({ url: "/example-entities/1" });
    const exception = new NotFoundException("Entity not found");

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: "Entity not found",
        path: "/example-entities/1",
      }),
    );
    expect(jsonFn.mock.calls[0][0]).toHaveProperty("timestamp");
  });

  it("catches unknown exceptions and returns 500", () => {
    const { host, statusFn, jsonFn } = makeHost();
    const exception = new Error("something broke");

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Internal Server Error",
      }),
    );
  });

  it("logs the error with stack trace", () => {
    const { host } = makeHost({ method: "POST", url: "/example-entities" });
    const exception = new Error("db connection lost");

    filter.catch(exception, host);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("POST /example-entities"),
      expect.any(String),
    );
  });

  it("includes request ID in log when present", () => {
    const { host } = makeHost({
      method: "GET",
      url: "/example-entities",
      requestId: "req-xyz-789",
    });
    const exception = new Error("oops");

    filter.catch(exception, host);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("req-xyz-789"),
      expect.any(String),
    );
  });

  it("includes requestId in error response body", () => {
    const { host, jsonFn } = makeHost({ requestId: "req-response-id" });
    const exception = new Error("fail");

    filter.catch(exception, host);

    const body = jsonFn.mock.calls[0][0];
    expect(body.requestId).toBe("req-response-id");
  });

  it("does not leak stack traces in the response body", () => {
    const { host, jsonFn } = makeHost();
    const exception = new Error("secret internals");

    filter.catch(exception, host);

    const responseBody = jsonFn.mock.calls[0][0];
    expect(responseBody).not.toHaveProperty("stack");
    expect(JSON.stringify(responseBody)).not.toContain("secret internals");
  });
});
