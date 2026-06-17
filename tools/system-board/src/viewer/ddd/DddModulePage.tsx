import type { DddModule } from "../../ddd-types";
import type { DddTab } from "../use-hash-route";
import { GraphLens } from "./GraphLens";
import { HexagonLens } from "./HexagonLens";
import { Overview } from "./Overview";
import { TimelineLens } from "./TimelineLens";

const TABS: Array<{ key: DddTab; label: string }> = [
  { key: "overview", label: "Обзор" },
  { key: "graph", label: "Граф" },
  { key: "timeline", label: "Таймлайн" },
  { key: "hexagon", label: "Гексагон" },
];

export function DddModulePage({ module, tab }: { module: DddModule; tab: DddTab }) {
  return (
    <div className="sb-ddd-page">
      <div className="sb-ddd-header">
        <a className="sb-back" href="#/ddd">
          ← DDD
        </a>
        <h1 className="sb-ddd-title">
          {module.context ?? module.module}
          <span className="sb-ddd-modtag">{module.module}</span>
        </h1>
      </div>

      <div className="sb-ddd-tabs">
        {TABS.map((t) => (
          <a
            key={t.key}
            href={`#/ddd/${module.module}/${t.key}`}
            className={`sb-ddd-tab${t.key === tab ? " is-active" : ""}`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <div className="sb-ddd-tabbody">
        {tab === "overview" && <Overview module={module} />}
        {tab === "graph" && <GraphLens module={module} />}
        {tab === "timeline" && <TimelineLens module={module} />}
        {tab === "hexagon" && <HexagonLens module={module} />}
      </div>
    </div>
  );
}
