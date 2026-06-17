import type { CanvasEdge, CanvasNode, NestModule } from "../types";

/**
 * Build a top-level module dependency board from NestJS modules:
 * nodes = unique top-level modules, edges = import relationships aggregated to
 * the top-level (intra-top-level and external imports are skipped).
 */
export function modulesToCanvas(modules: NestModule[]): {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
} {
  const topLevels = [...new Set(modules.map((m) => m.topLevel))].sort();
  const nodes: CanvasNode[] = topLevels.map((top) => ({
    id: top,
    label: top,
    kind: "product",
  }));

  const idToTop = new Map(modules.map((m) => [m.id, m.topLevel]));
  const seen = new Set<string>();
  const edges: CanvasEdge[] = [];
  for (const m of modules) {
    for (const importId of m.importIds) {
      const target = idToTop.get(importId);
      if (!target || target === m.topLevel) continue;
      const key = `${m.topLevel}->${target}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push({ id: key, source: m.topLevel, target, label: "imports" });
    }
  }
  return { nodes, edges };
}
