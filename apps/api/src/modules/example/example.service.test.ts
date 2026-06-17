import { describe, expect, it } from "vitest";
import { mapExampleEntity } from "./example.service";

describe("mapExampleEntity", () => {
  it("maps a DB row to the shared contract, converting dates to ISO and dropping profileId", () => {
    const row = {
      id: "00000000-0000-4000-8000-000000000000",
      name: "Demo",
      description: null,
      profileId: "11111111-1111-4111-8111-111111111111",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    };

    expect(mapExampleEntity(row)).toEqual({
      id: "00000000-0000-4000-8000-000000000000",
      name: "Demo",
      description: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    });
  });
});
