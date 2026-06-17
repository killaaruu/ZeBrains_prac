/**
 * DDD module model — the contract between the generator skill (backend) and the
 * read-only web viewer. Authored in per-module `*.ddd.yaml`, assembled into the
 * generated system map. See docs/superpowers/specs/2026-05-31-system-board-ddd-docs-design.md
 */

export type ReadinessLevel = "done" | "part" | "miss";
export type Readiness = { score: number; level: ReadinessLevel };

export type DddElementType =
  | "aggregate"
  | "entity"
  | "valueObject"
  | "event"
  | "command"
  | "policy"
  | "port"
  | "readModel"
  | "actor";

export type Invariant = { rule: string; why?: string };

/** A single typed element of a DDD module (aggregate, event, command, …). */
export type DddComponent = {
  id: string;
  type: DddElementType;
  name: string;
  /** One-liner shown in overview lists. */
  summary?: string;
  /** Plain-language layer: 1–2 sentences, no code symbols — what it is + why it matters. */
  overview?: string;
  /** Technical layer: detailed markdown prose, may reference code symbols. */
  docs?: string;
  invariants?: Invariant[];
  fields?: string[];
  /** Command contract, e.g. "ParseBrief{ id } → BriefParsed". */
  signature?: string;
  /** Event payload shape. */
  payload?: string;
  /** Aggregate root flag. */
  root?: boolean;

  // --- relations (ids of other components, unless noted) ---
  /** aggregate → command ids it handles */
  handles?: string[];
  /** aggregate → event ids it emits */
  emits?: string[];
  /** command → aggregate id it targets */
  target?: string;
  /** command → event ids it produces */
  produces?: string[];
  /** event → aggregate id that emits it */
  emittedBy?: string;
  /** event → policy ids that react */
  reactions?: string[];
  /** event → command ids triggered downstream */
  downstream?: string[];
  /** policy condition */
  when?: string;
  /** policy → command id triggered */
  then?: string;
  /** command/policy → module name implementing it (adapter) */
  via?: string;

  // --- cross-cutting overlays ---
  readiness?: Readiness;
  /** production blockers surfaced on board + overview */
  hotspots?: string[];
  /** drift note (orphan / code-only / model-code mismatch) */
  drift?: string;
  source?: { file?: string; line?: number };
};

export type DddPort = { module: string; role: "driving" | "driven"; direction: "in" | "out" };
export type DddPorts = { in?: DddPort[]; out?: DddPort[] };
export type DddProcessStep = {
  step: number;
  command?: string;
  actor?: string;
  via?: string;
  label?: string;
};
export type LanguageTerm = { term: string; code?: string; means?: string };

export type DddModule = {
  module: string;
  type: "ddd" | "standard";
  context?: string;
  tagline?: string;
  status?: "prototype" | "mvp" | "prod" | "deprecated";
  readiness?: Readiness;
  language?: LanguageTerm[];
  components: DddComponent[];
  ports?: DddPorts;
  process?: DddProcessStep[];
  externalSystems?: string[];
};
