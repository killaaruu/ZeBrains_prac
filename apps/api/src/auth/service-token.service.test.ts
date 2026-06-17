import { beforeEach, describe, expect, it } from "vitest";
import { ServiceTokenService } from "./service-token.service";

function makeConfigService(envVars: Record<string, string | undefined> = {}) {
  return {
    get: (key: string) => envVars[key],
  } as never;
}

const VALID_TOKENS_JSON = JSON.stringify({
  tok_analytics: { module: "analytics", role: "reader", tables: ["events", "metrics"] },
  tok_billing: { module: "billing", role: "writer" },
});

describe("ServiceTokenService", () => {
  let service: ServiceTokenService;

  beforeEach(() => {
    service = new ServiceTokenService(makeConfigService({ SERVICE_TOKENS: VALID_TOKENS_JSON }));
  });

  it("returns null for unknown token", () => {
    const result = service.resolve("unknown-token");
    expect(result).toBeNull();
  });

  it("returns ServiceUser for valid token", () => {
    const result = service.resolve("tok_analytics");
    expect(result).not.toBeNull();
    expect(result!.module).toBe("analytics");
    expect(result!.role).toBe("reader");
  });

  it("has correct id format service:<module>", () => {
    const result = service.resolve("tok_analytics");
    expect(result!.id).toBe("service:analytics");
  });

  it("has isServiceToken set to true", () => {
    const result = service.resolve("tok_analytics");
    expect(result!.isServiceToken).toBe(true);
  });

  it("includes table whitelist from config", () => {
    const result = service.resolve("tok_analytics");
    expect(result!.tables).toEqual(["events", "metrics"]);
  });

  it("omits tables when not specified in config", () => {
    const result = service.resolve("tok_billing");
    expect(result!.tables).toBeUndefined();
  });

  it("handles missing env var gracefully", () => {
    const svc = new ServiceTokenService(makeConfigService({}));
    const result = svc.resolve("tok_analytics");
    expect(result).toBeNull();
  });

  it("handles invalid JSON env var gracefully", () => {
    const svc = new ServiceTokenService(makeConfigService({ SERVICE_TOKENS: "not-valid-json" }));
    const result = svc.resolve("tok_analytics");
    expect(result).toBeNull();
  });
});
