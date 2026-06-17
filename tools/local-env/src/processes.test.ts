import { afterEach, describe, expect, it } from "vitest";
import { waitForHttp } from "./processes";

describe("waitForHttp", () => {
  const originalTimeout = process.env.LOCAL_ENV_HTTP_TIMEOUT_MS;

  afterEach(() => {
    if (originalTimeout === undefined) {
      delete process.env.LOCAL_ENV_HTTP_TIMEOUT_MS;
    } else {
      process.env.LOCAL_ENV_HTTP_TIMEOUT_MS = originalTimeout;
    }
  });

  it("uses LOCAL_ENV_HTTP_TIMEOUT_MS when no explicit timeout is provided", async () => {
    process.env.LOCAL_ENV_HTTP_TIMEOUT_MS = "10";

    await expect(waitForHttp("http://127.0.0.1:9/health")).rejects.toThrow(
      "Timed out waiting for http://127.0.0.1:9/health",
    );
  });
});
