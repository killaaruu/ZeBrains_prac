import { MODULE_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { QueueModule } from "./queue.module";

describe("QueueModule runtime wiring", () => {
  it("does not keep template-only runtime providers", () => {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, QueueModule) as
      | unknown[]
      | undefined;

    expect(providers ?? []).toEqual([]);
  });
});
