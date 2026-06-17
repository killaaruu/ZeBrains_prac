import type { DddComponent, Readiness } from "../../ddd-types";
import { READINESS_COLOR, READINESS_LABEL, TYPE_COLOR, TYPE_LABEL } from "./ddd-ui";

export function ReadinessDot({ readiness }: { readiness?: Readiness }) {
  if (!readiness) return null;
  return (
    <span
      className="sb-ddd-dot"
      title={`${READINESS_LABEL[readiness.level]} · ${readiness.score}%`}
      style={{ background: READINESS_COLOR[readiness.level] }}
    />
  );
}

export function ReadinessTag({ readiness }: { readiness?: Readiness }) {
  if (!readiness) return null;
  const color = READINESS_COLOR[readiness.level];
  return (
    <span className="sb-ddd-rtag" style={{ color, borderColor: color }}>
      {READINESS_LABEL[readiness.level]} · {readiness.score}%
    </span>
  );
}

export function TypeBadge({ type }: { type: DddComponent["type"] }) {
  return (
    <span className="sb-ddd-typebadge" style={{ background: TYPE_COLOR[type] }}>
      {TYPE_LABEL[type]}
    </span>
  );
}

/** Clickable chip linking to a component page; falls back to id if missing. */
export function CompChip({
  moduleId,
  id,
  components,
}: {
  moduleId: string;
  id: string;
  components: DddComponent[];
}) {
  const c = components.find((x) => x.id === id);
  return (
    <a
      className="sb-ddd-chip"
      href={`#/ddd/${moduleId}/c/${id}`}
      style={c ? { borderColor: TYPE_COLOR[c.type] } : undefined}
    >
      {c ? c.name : id}
    </a>
  );
}
