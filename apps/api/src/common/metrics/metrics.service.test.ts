import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetricsService } from "./metrics.service";

describe("MetricsService", () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  describe("recordRequest", () => {
    it("increments total request count", () => {
      service.recordRequest("GET", "/health", 200, 50);
      service.recordRequest("POST", "/api/deals", 201, 100);

      const snapshot = service.getSnapshot();
      expect(snapshot.totalRequests).toBe(2);
    });

    it("tracks error count for 4xx and 5xx statuses", () => {
      service.recordRequest("GET", "/api/deals", 200, 50);
      service.recordRequest("POST", "/api/deals", 400, 30);
      service.recordRequest("GET", "/api/missing", 404, 10);
      service.recordRequest("POST", "/api/crash", 500, 200);

      const snapshot = service.getSnapshot();
      expect(snapshot.totalErrors).toBe(3);
    });

    it("tracks errors by status code", () => {
      service.recordRequest("GET", "/a", 400, 10);
      service.recordRequest("GET", "/b", 400, 10);
      service.recordRequest("GET", "/c", 500, 10);

      const snapshot = service.getSnapshot();
      expect(snapshot.errorsByStatus[400]).toBe(2);
      expect(snapshot.errorsByStatus[500]).toBe(1);
    });

    it("calculates average response time", () => {
      service.recordRequest("GET", "/a", 200, 100);
      service.recordRequest("GET", "/b", 200, 200);
      service.recordRequest("GET", "/c", 200, 300);

      const snapshot = service.getSnapshot();
      expect(snapshot.avgResponseTimeMs).toBe(200);
    });
  });

  describe("getSnapshot", () => {
    it("returns zero counters when no requests recorded", () => {
      const snapshot = service.getSnapshot();

      expect(snapshot.totalRequests).toBe(0);
      expect(snapshot.totalErrors).toBe(0);
      expect(snapshot.avgResponseTimeMs).toBe(0);
      expect(snapshot.errorsByStatus).toEqual({});
      expect(snapshot.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });

    it("includes uptime in seconds", () => {
      const snapshot = service.getSnapshot();
      expect(typeof snapshot.uptimeSeconds).toBe("number");
      expect(snapshot.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getErrorRate", () => {
    it("returns 0 when no requests", () => {
      expect(service.getErrorRate()).toBe(0);
    });

    it("calculates error rate as percentage", () => {
      service.recordRequest("GET", "/a", 200, 10);
      service.recordRequest("GET", "/b", 200, 10);
      service.recordRequest("GET", "/c", 500, 10);
      service.recordRequest("GET", "/d", 500, 10);

      expect(service.getErrorRate()).toBe(50);
    });
  });

  describe("alert threshold", () => {
    it("logs warning when error rate exceeds threshold", () => {
      const warnSpy = vi.spyOn((service as any).logger, "warn").mockImplementation(() => {});

      // Record 6 errors out of 10 requests (60% error rate, default threshold is 50%)
      for (let i = 0; i < 4; i++) {
        service.recordRequest("GET", `/ok-${i}`, 200, 10);
      }
      for (let i = 0; i < 6; i++) {
        service.recordRequest("GET", `/err-${i}`, 500, 10);
      }

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("error rate"));
    });

    it("does not log warning when error rate is below threshold", () => {
      const warnSpy = vi.spyOn((service as any).logger, "warn").mockImplementation(() => {});

      service.recordRequest("GET", "/a", 200, 10);
      service.recordRequest("GET", "/b", 200, 10);
      service.recordRequest("GET", "/c", 500, 10);

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
