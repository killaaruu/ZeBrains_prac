import dagre from "@dagrejs/dagre";
import type { CanvasEdge, CanvasNode } from "../types";

export const NODE_W = 160;
export const NODE_H = 44;

export type XY = { x: number; y: number };

/** Compute a left-to-right dagre layout. Returns id -> top-left {x,y}. */
export function layoutPositions(nodes: CanvasNode[], edges: CanvasEdge[]): Record<string, XY> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 90 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const node of nodes) g.setNode(node.id, { width: NODE_W, height: NODE_H });
  for (const edge of edges) g.setEdge(edge.source, edge.target);
  dagre.layout(g);

  const positions: Record<string, XY> = {};
  for (const node of nodes) {
    const { x, y } = g.node(node.id);
    positions[node.id] = { x: x - NODE_W / 2, y: y - NODE_H / 2 };
  }
  return positions;
}
