import type { DddModule } from "../../ddd-types";
import { GROUPS, TYPE_COLOR } from "./ddd-ui";
import { ReadinessDot } from "./parts";

export function Overview({ module }: { module: DddModule }) {
  const blockers = module.components.filter((c) => c.hotspots?.length).length;
  const drift = module.components.filter((c) => c.drift).length;

  return (
    <div className="sb-ddd-overview">
      {module.tagline && <p className="sb-ddd-lead">{module.tagline}</p>}

      <div className="sb-ddd-stats">
        <Stat n={`${module.readiness?.score ?? "—"}%`} label="readiness" />
        <Stat n={module.components.length} label="компонентов" />
        <Stat n={blockers} label="прод-блокеров" warn={blockers > 0} />
        <Stat n={drift} label="drift" warn={drift > 0} />
      </div>

      {module.language && module.language.length > 0 && (
        <details className="sb-block" open>
          <summary>Ubiquitous Language</summary>
          <div className="sb-block__body">
            <table className="sb-ddd-lang">
              <tbody>
                {module.language.map((l) => (
                  <tr key={l.term}>
                    <td className="sb-ddd-lang__term">{l.term}</td>
                    <td className="sb-ddd-lang__means">{l.means}</td>
                    <td className="sb-ddd-lang__code">{l.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <div className="sb-ddd-groups">
        {GROUPS.map(({ type, title }) => {
          const items = module.components.filter((c) => c.type === type);
          if (items.length === 0) return null;
          return (
            <div className="sb-ddd-group" key={type}>
              <h4 className="sb-ddd-group__title">
                <span className="sb-ddd-group__swatch" style={{ background: TYPE_COLOR[type] }} />
                {title}
                <span className="sb-ddd-group__count">{items.length}</span>
              </h4>
              {items.map((c) => (
                <a className="sb-ddd-item" key={c.id} href={`#/ddd/${module.module}/c/${c.id}`}>
                  <ReadinessDot readiness={c.readiness} />
                  <span className="sb-ddd-item__name">{c.name}</span>
                  <span className="sb-ddd-item__summary">{c.summary}</span>
                  {c.hotspots?.length ? <span className="sb-ddd-flag">блокер</span> : null}
                  {c.drift ? <span className="sb-ddd-flag">drift</span> : null}
                </a>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ n, label, warn }: { n: string | number; label: string; warn?: boolean }) {
  return (
    <div className={`sb-ddd-stat${warn ? " is-warn" : ""}`}>
      <div className="sb-ddd-stat__n">{n}</div>
      <div className="sb-ddd-stat__l">{label}</div>
    </div>
  );
}
