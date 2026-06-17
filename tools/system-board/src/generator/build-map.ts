import type { CanvasEdge, CanvasNode, Product, SystemMap } from "../types";
import { buildModules } from "./build-modules";
import { loadContent } from "./load-content";
import { loadDddModules } from "./load-ddd";
import { scanDocs } from "./scan-docs";
import { scanModules } from "./scan-modules";
import { scanTests } from "./scan-tests";

/** Build the full SystemMap from repo facts + curated content. */
export function buildMap(repoRoot: string, contentDir: string): SystemMap {
  const content = loadContent(contentDir);

  const products: Product[] = content.products.map((config) => ({
    id: config.id,
    title: config.title,
    tagline: config.tagline,
    status: config.status,
    architectureMd: content.architecture[config.id] ?? "",
    modules: scanModules(repoRoot, config.slugs),
    tests: { ...scanTests(repoRoot, config.slugs), key: content.testsKey[config.id] ?? [] },
    docs: scanDocs(repoRoot, config.slugs),
    integrations: config.integrations,
  }));

  const nodes: CanvasNode[] = [
    ...products.map((p) => ({ id: p.id, label: p.title, kind: "product" as const })),
    ...content.externalSystems.map((e) => ({
      id: e.id,
      label: e.title,
      kind: "external" as const,
    })),
  ];

  const edges: CanvasEdge[] = products.flatMap((p) =>
    p.integrations.map((integration) => ({
      id: `${p.id}->${integration.target}`,
      source: p.id,
      target: integration.target,
      label: integration.kind,
    })),
  );

  const nodeIds = new Set(nodes.map((n) => n.id));
  for (const edge of edges) {
    if (!nodeIds.has(edge.target)) {
      console.warn(
        `[system-board] edge target "${edge.target}" has no canvas node (source: ${edge.source})`,
      );
    }
  }

  return {
    products,
    externalSystems: content.externalSystems,
    canvas: { nodes, edges },
    modules: buildModules(repoRoot, content),
    dddModules: loadDddModules(contentDir, repoRoot),
  };
}
