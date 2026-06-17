import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Canvas } from "./Canvas";

vi.mock("@xyflow/react", () => ({
  Background: () => null,
  Controls: () => null,
  ReactFlow: ({
    nodes,
    children,
  }: {
    nodes: Array<{ data?: { label?: string } }>;
    children: React.ReactNode;
  }) => (
    <div>
      {nodes.map((node) => (
        <div key={node.data?.label}>{node.data?.label}</div>
      ))}
      {children}
    </div>
  ),
  useEdgesState: <T,>(edges: T[]) => [edges, vi.fn(), vi.fn()],
  useNodesState: <T,>(nodes: T[]) => [nodes, vi.fn(), vi.fn()],
}));

vi.mock("./to-flow", () => ({
  toFlow: (canvas: { nodes: Array<{ id: string; label: string }>; edges: unknown[] }) => ({
    nodes: canvas.nodes.map((node) => ({
      id: node.id,
      position: { x: 0, y: 0 },
      data: { label: node.label },
    })),
    edges: canvas.edges,
  }),
}));

describe("Canvas", () => {
  it("renders product and external node labels", () => {
    render(
      <Canvas
        canvas={{
          nodes: [
            { id: "sales-os", label: "SalesOS", kind: "product" },
            { id: "supabase", label: "Supabase", kind: "external" },
          ],
          edges: [
            { id: "sales-os->supabase", source: "sales-os", target: "supabase", label: "storage" },
          ],
        }}
      />,
    );
    expect(screen.getByText("SalesOS")).toBeInTheDocument();
    expect(screen.getByText("Supabase")).toBeInTheDocument();
  });
});
