import type { DddModule } from "./ddd-types";

export type ProductStatus = "mvp" | "prod" | "deprecated";

/** A file/folder in the codebase, used to build a Zed deep link. */
export type SourceNode = { name: string; path: string; line?: number };

export type Integration = { target: string; kind: string };

export type ProductModules = {
  backend: SourceNode[];
  frontend: SourceNode[];
  schemas: SourceNode[];
  db: SourceNode[];
};

export type ProductTests = { total: number; files: number; key: string[] };

export type DocRef = { title: string; path: string };

export type Product = {
  id: string;
  title: string;
  tagline: string;
  status: ProductStatus;
  architectureMd: string;
  modules: ProductModules;
  tests: ProductTests;
  docs: DocRef[];
  integrations: Integration[];
};

export type ExternalSystem = { id: string; title: string };

export type CanvasNode = { id: string; label: string; kind: "product" | "external" };
export type CanvasEdge = { id: string; source: string; target: string; label: string };

export type NestModule = {
  id: string;
  name: string;
  topLevel: string;
  file: SourceNode;
  parentId: string | null;
  childIds: string[];
  importIds: string[];
  importExternal: string[];
  tests: { total: number; files: number };
  docs: DocRef[];
  architectureMd: string;
  status: ProductStatus | null;
  integrations: Integration[];
};

export type SystemMap = {
  products: Product[];
  externalSystems: ExternalSystem[];
  canvas: { nodes: CanvasNode[]; edges: CanvasEdge[] };
  modules: NestModule[];
  /** DDD modules assembled from per-module `*.ddd.yaml`. */
  dddModules: DddModule[];
};

export type { DddModule };

/** Shape parsed from content/products.yaml (curated). */
export type ProductConfig = {
  id: string;
  title: string;
  tagline: string;
  status: ProductStatus;
  slugs: string[];
  integrations: Integration[];
};

export type ContentData = {
  products: ProductConfig[];
  externalSystems: ExternalSystem[];
  /** id -> architecture markdown */
  architecture: Record<string, string>;
  /** id -> curated key test scenarios */
  testsKey: Record<string, string[]>;
};
