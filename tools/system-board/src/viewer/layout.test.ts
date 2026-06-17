import { describe, expect, it } from "vitest";
import { layoutPositions } from "./layout";

describe("layoutPositions", () => {
  it("assigns a distinct {x,y} to every node id", () => {
    const positions = layoutPositions(
      [
        { id: "a", label: "A", kind: "product" },
        { id: "b", label: "B", kind: "external" },
      ],
      [{ id: "a->b", source: "a", target: "b", label: "x" }],
    );
    expect(positions.a).toBeDefined();
    expect(positions.b).toBeDefined();
    expect(typeof positions.a!.x).toBe("number");
    expect(positions.a!.x).not.toBe(positions.b!.x);
  });

  it("handles nodes with no edges", () => {
    const positions = layoutPositions([{ id: "solo", label: "S", kind: "product" }], []);
    expect(positions.solo).toBeDefined();
  });
});
