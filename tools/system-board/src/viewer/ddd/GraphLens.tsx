import { Background, type Edge, type Node, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import type { DddComponent, DddElementType, DddModule } from "../../ddd-types";
import { TYPE_COLOR } from "./ddd-ui";

/** Vertical band (y) per element type — a simple layered domain layout. */
const BAND: Partial<Record<DddElementType, number>> = {
  command: 0,
  policy: 150,
  aggregate: 300,
  event: 470,
};
const COL_GAP = 230;

function buildFlow(module: DddModule): { nodes: Node[]; edges: Edge[] } {
  const inGraph = module.components.filter((c) => BAND[c.type] !== undefined);
  const byBand = new Map<number, DddComponent[]>();
  for (const c of inGraph) {
    const y = BAND[c.type] as number;
    const arr = byBand.get(y) ?? [];
    arr.push(c);
    byBand.set(y, arr);
  }

  const nodes: Node[] = [];
  for (const [y, comps] of byBand) {
    comps.forEach((c, i) => {
      const dashed = Boolean(c.drift);
      nodes.push({
        id: c.id,
        position: { x: 40 + i * COL_GAP, y },
        data: { label: c.name },
        style: {
          background: dashed ? "#1b2030" : TYPE_COLOR[c.type],
          color: dashed ? "#f87171" : "#1a1205",
          border: dashed ? "2px dashed #f87171" : "1px solid rgba(0,0,0,.15)",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          width: 170,
        },
      });
    });
  }

  const ids = new Set(inGraph.map((c) => c.id));
  const edges: Edge[] = [];
  const link = (source: string, target: string) => {
    if (!ids.has(source) || !ids.has(target)) return;
    const id = `${source}->${target}`;
    if (edges.some((e) => e.id === id)) return;
    edges.push({ id, source, target });
  };
  for (const c of inGraph) {
    if (c.type === "command" && c.target) link(c.id, c.target);
    if (c.type === "aggregate") for (const e of c.emits ?? []) link(c.id, e);
    if (c.type === "event") for (const p of c.reactions ?? []) link(c.id, p);
    if (c.type === "policy" && c.then) link(c.id, c.then);
  }
  return { nodes, edges };
}

export function GraphLens({ module }: { module: DddModule }) {
  const { nodes, edges } = useMemo(() => buildFlow(module), [module]);
  return (
    <div className="sb-canvas" style={{ height: 560 }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        onNodeClick={(_, node) => {
          window.location.hash = `#/ddd/${module.module}/c/${node.id}`;
        }}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}
