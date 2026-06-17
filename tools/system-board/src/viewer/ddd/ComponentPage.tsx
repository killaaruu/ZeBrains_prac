import Markdown from "react-markdown";
import type { DddComponent, DddModule } from "../../ddd-types";
import { CompChip, ReadinessTag, TypeBadge } from "./parts";

export function ComponentPage({ module, componentId }: { module: DddModule; componentId: string }) {
  const c = module.components.find((x) => x.id === componentId);

  if (!c) {
    return (
      <div className="sb-detail">
        <a className="sb-back" href={`#/ddd/${module.module}`}>
          ← {module.module}
        </a>
        <p className="sb-empty">Компонент «{componentId}» не найден</p>
      </div>
    );
  }

  const components = module.components;
  const relations = relationRows(c);

  return (
    <div className="sb-ddd-detail">
      <a className="sb-back" href={`#/ddd/${module.module}`}>
        ← {module.context ?? module.module}
      </a>
      <header className="sb-detail__head">
        <h1>{c.name}</h1>
        <TypeBadge type={c.type} />
        {c.root && <span className="sb-ddd-roottag">root</span>}
        <ReadinessTag readiness={c.readiness} />
      </header>

      {c.drift && <div className="sb-ddd-alert sb-ddd-alert--drift">⚑ drift: {c.drift}</div>}
      {c.hotspots?.map((h) => (
        <div className="sb-ddd-alert sb-ddd-alert--hot" key={h}>
          🔥 {h}
        </div>
      ))}

      <div className="sb-ddd-detail__grid">
        <div className="sb-ddd-detail__main">
          {c.signature && <p className="sb-ddd-sig">{c.signature}</p>}
          {c.payload && (
            <p className="sb-ddd-sig">
              payload: <code>{c.payload}</code>
            </p>
          )}
          {c.overview && (
            <div className="sb-ddd-overview">
              <Markdown>{c.overview}</Markdown>
            </div>
          )}

          {c.docs ? (
            <details className="sb-ddd-details" open={!c.overview}>
              <summary className="sb-ddd-details__summary">
                Технические детали
                <span className="sb-ddd-authored">◆ сгенерировано LLM</span>
              </summary>
              <div className="sb-ddd-prose">
                <Markdown>{c.docs}</Markdown>
              </div>
            </details>
          ) : (
            !c.overview && (
              <div className="sb-ddd-prose sb-empty">
                Документация ещё не сгенерирована для этого элемента.
              </div>
            )
          )}

          {c.invariants && c.invariants.length > 0 && (
            <div className="sb-ddd-invariants">
              <h4 className="sb-ddd-h4">Инварианты</h4>
              {c.invariants.map((inv) => (
                <div className="sb-ddd-inv" key={inv.rule}>
                  <div className="sb-ddd-inv__rule">⊘ {inv.rule}</div>
                  {inv.why && <div className="sb-ddd-inv__why">почему: {inv.why}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="sb-ddd-detail__side">
          {relations.length > 0 && (
            <div className="sb-ddd-card">
              <h4 className="sb-ddd-h4">Связи</h4>
              {relations.map((r) => (
                <div className="sb-ddd-rel" key={r.label}>
                  <span className="sb-ddd-rel__label">{r.label}</span>
                  <div className="sb-ddd-rel__chips">
                    {r.ids.map((id) => (
                      <CompChip key={id} moduleId={module.module} id={id} components={components} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="sb-ddd-card">
            <h4 className="sb-ddd-h4">Реализация · as-built</h4>
            <div className="sb-ddd-kv">
              <span>readiness</span>
              <ReadinessTag readiness={c.readiness} />
            </div>
            {c.via && (
              <div className="sb-ddd-kv">
                <span>через</span>
                <code>{c.via}</code>
              </div>
            )}
            {c.fields && c.fields.length > 0 && (
              <div className="sb-ddd-kv sb-ddd-kv--col">
                <span>поля</span>
                <code>{c.fields.join(" · ")}</code>
              </div>
            )}
            {c.source?.file && (
              <a
                className="sb-zed sb-ddd-zed"
                href={`zed://file/${c.source.file.replace(/^\//, "")}${
                  c.source.line ? `:${c.source.line}` : ""
                }`}
              >
                ↳ {c.source.file} ↗
              </a>
            )}
            <button type="button" className="sb-ddd-export">
              ⤓ Экспорт в LLM
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function relationRows(c: DddComponent): Array<{ label: string; ids: string[] }> {
  const rows: Array<{ label: string; ids: string[] }> = [];
  const add = (label: string, ids?: string[]) => {
    if (ids?.length) rows.push({ label, ids });
  };
  add("обрабатывает", c.handles);
  add("эмитит", c.emits);
  if (c.target) add("агрегат", [c.target]);
  add("порождает", c.produces);
  if (c.emittedBy) add("эмитится", [c.emittedBy]);
  add("реагируют", c.reactions);
  add("дальше", c.downstream);
  if (c.then) add("триггерит", [c.then]);
  return rows;
}
