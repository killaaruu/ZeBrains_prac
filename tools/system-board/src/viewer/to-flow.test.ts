import { describe, expect, it } from "vitest";
import { toFlow } from "./to-flow";

const canvas = {
  nodes: [
    { id: "a", label: "A", kind: "product" as const },
    { id: "b", label: "B", kind: "external" as const },
  ],
  edges: [{ id: "a->b", source: "a", target: "b", label: "storage" }],
};

describe("toFlow", () => {
  it("maps canvas nodes to positioned React Flow nodes", () => {
    const { nodes } = toFlow(canvas);
    const a = nodes.find((n) => n.id === "a");
    expect(a?.data.label).toBe("A");
    expect(a?.position).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
    expect(a?.className).toContain("product");
  });

  it("maps canvas edges to labeled React Flow edges", () => {
    const { edges } = toFlow(canvas);
    expect(edges[0]).toMatchObject({ id: "a->b", source: "a", target: "b", label: "storage" });
  });
});
