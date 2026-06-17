import { beforeEach, describe, expect, it, vi } from "vitest";
import { getRequestId, RequestIdMiddleware } from "./request-id.middleware";

function makeReqRes() {
  const req: Record<string, unknown> = { headers: {} };
  const res = { setHeader: vi.fn() };
  return { req, res };
}

describe("RequestIdMiddleware", () => {
  let middleware: RequestIdMiddleware;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();
  });

  it("generates a UUID and attaches it to request", async () => {
    const { req, res } = makeReqRes();

    await new Promise<void>((resolve) => {
      middleware.use(req as any, res as any, () => {
        expect(req.requestId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
        resolve();
      });
    });
  });

  it("sets X-Request-Id response header", async () => {
    const { req, res } = makeReqRes();

    await new Promise<void>((resolve) => {
      middleware.use(req as any, res as any, () => {
        expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", req.requestId);
        resolve();
      });
    });
  });

  it("reuses existing X-Request-Id from incoming request", async () => {
    const { req, res } = makeReqRes();
    const existingId = "existing-request-id-123";
    (req.headers as Record<string, string>)["x-request-id"] = existingId;

    await new Promise<void>((resolve) => {
      middleware.use(req as any, res as any, () => {
        expect(req.requestId).toBe(existingId);
        expect(res.setHeader).toHaveBeenCalledWith("X-Request-Id", existingId);
        resolve();
      });
    });
  });

  it("makes request ID available via AsyncLocalStorage", async () => {
    const { req, res } = makeReqRes();

    await new Promise<void>((resolve) => {
      middleware.use(req as any, res as any, () => {
        const storedId = getRequestId();
        expect(storedId).toBe(req.requestId);
        resolve();
      });
    });
  });
});
