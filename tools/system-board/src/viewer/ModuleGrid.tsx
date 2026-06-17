import type { NestModule } from "../types";

/** Group modules by their top-level NestJS module and render a section per group. */
export function ModuleGrid({ modules }: { modules: NestModule[] }) {
  const groups = new Map<string, NestModule[]>();
  for (const m of modules) {
    const arr = groups.get(m.topLevel) ?? [];
    arr.push(m);
    groups.set(m.topLevel, arr);
  }
  const topLevels = [...groups.keys()].sort();

  return (
    <div className="sb-grid-wrap">
      <p className="sb-grid-count">
        {modules.length} модулей · {topLevels.length} групп
      </p>
      {topLevels.map((top) => (
        <section key={top} className="sb-group">
          <h3 className="sb-group__title">
            {top}
            <span className="sb-group__count">{groups.get(top)?.length ?? 0}</span>
          </h3>
          <div className="sb-grid">
            {(groups.get(top) ?? []).map((m) => (
              <a key={m.id} className="sb-card" href={`#/module/${m.id}`}>
                <span className="sb-card__name">{m.name}</span>
                <span className="sb-card__group">{m.id}</span>
                <span className="sb-card__tests">{m.tests.total} тестов</span>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
