import type { DddElementType, ReadinessLevel } from "../../ddd-types";

/** ES grammar colours — readable on the light viewer theme. */
export const TYPE_COLOR: Record<DddElementType, string> = {
  aggregate: "#f4c430",
  entity: "#9ccc65",
  valueObject: "#f48fb1",
  event: "#ff9f1c",
  command: "#4dabf7",
  policy: "#b197fc",
  port: "#4dd0e1",
  readModel: "#66bb6a",
  actor: "#ffd54f",
};

export const TYPE_LABEL: Record<DddElementType, string> = {
  aggregate: "Aggregate",
  entity: "Entity",
  valueObject: "Value Object",
  event: "Event",
  command: "Command",
  policy: "Policy",
  port: "Port / Adapter",
  readModel: "Read Model",
  actor: "Actor",
};

/** Overview group order + Russian titles. */
export const GROUPS: Array<{ type: DddElementType; title: string }> = [
  { type: "aggregate", title: "Агрегаты" },
  { type: "entity", title: "Сущности" },
  { type: "valueObject", title: "Value Objects" },
  { type: "event", title: "Доменные события" },
  { type: "command", title: "Команды" },
  { type: "policy", title: "Политики" },
  { type: "port", title: "Порты / адаптеры" },
  { type: "readModel", title: "Read Models" },
  { type: "actor", title: "Акторы" },
];

export const READINESS_COLOR: Record<ReadinessLevel, string> = {
  done: "#34d399",
  part: "#fbbf24",
  miss: "#f87171",
};

export const READINESS_LABEL: Record<ReadinessLevel, string> = {
  done: "готов",
  part: "частично",
  miss: "не доведён",
};
