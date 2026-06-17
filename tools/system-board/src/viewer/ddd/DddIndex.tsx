import type { DddModule } from "../../ddd-types";
import { ReadinessDot } from "./parts";

export function DddIndex({ modules }: { modules: DddModule[] }) {
  const ddd = modules.filter((m) => m.type === "ddd");

  return (
    <div className="sb-grid-wrap">
      <p className="sb-grid-count">{ddd.length} DDD-модулей</p>
      {ddd.length === 0 && <p className="sb-empty">Нет `*.ddd.yaml` моделей.</p>}
      <div className="sb-grid">
        {ddd.map((m) => (
          <a className="sb-card" key={m.module} href={`#/ddd/${m.module}`}>
            <span className="sb-card__group">{m.status ?? "ddd"}</span>
            <span className="sb-card__name">
              <ReadinessDot readiness={m.readiness} /> {m.context ?? m.module}
            </span>
            <span className="sb-card__tests">{m.tagline}</span>
            <span className="sb-card__tests">{m.components.length} компонентов</span>
          </a>
        ))}
      </div>
    </div>
  );
}
