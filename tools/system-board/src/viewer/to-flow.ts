import type { Edge, Node } from "@xyflow/react";
import type { CanvasEdge, CanvasNode } from "../types";
import { layoutPositions } from "./layout";

export function toFlow(canvas: { nodes: CanvasNode[]; edges: CanvasEdge[] }): {
  nodes: Node[];
  edges: Edge[];
} {
  const positions = layoutPositions(canvas.nodes, canvas.edges);
  const nodes: Node[] = canvas.nodes.map((node) => ({
    id: node.id,
    position: positions[node.id] ?? { x: 0, y: 0 },
    data: { label: node.label },
    className: `sb-node sb-node--${node.kind}`,
  }));
  const edges: Edge[] = canvas.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
  }));
  return { nodes, edges };
}
