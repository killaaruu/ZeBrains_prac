import type { DddComponent, DddModule } from "../../ddd-types";
import { TYPE_COLOR } from "./ddd-ui";

export function TimelineLens({ module }: { module: DddModule }) {
  const find = (id?: string) => module.components.find((c) => c.id === id);
  const steps = [...(module.process ?? [])].sort((a, b) => a.step - b.step);

  if (steps.length === 0) {
    return <p className="sb-empty sb-ddd-pad">У модуля не описан `process` для таймлайна.</p>;
  }

  return (
    <div className="sb-ddd-tl">
      {steps.map((s) => {
        const cmd = find(s.command);
        const events = (cmd?.produces ?? []).map(find).filter(Boolean) as DddComponent[];
        const policies = module.components.filter(
          (c) => c.type === "policy" && c.then === s.command,
        );
        const actor = find(s.actor);
        return (
          <div className="sb-ddd-beat" key={s.step}>
            <div className="sb-ddd-beat__h">
              {s.step}. {s.label ?? cmd?.name ?? s.command}
            </div>
            {actor && <div className="sb-ddd-beat__actor">🧑 {actor.name}</div>}
            {policies.map((p) => (
              <Chip key={p.id} module={module.module} c={p} />
            ))}
            {cmd && (
              <Chip module={module.module} c={cmd} sub={s.via ? `via ${s.via}` : undefined} />
            )}
            {events.map((e) => (
              <Chip key={e.id} module={module.module} c={e} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Chip({ module, c, sub }: { module: string; c: DddComponent; sub?: string }) {
  return (
    <a
      className="sb-ddd-tlchip"
      href={`#/ddd/${module}/c/${c.id}`}
      style={{ background: TYPE_COLOR[c.type] }}
    >
      {c.name}
      {sub && <span className="sb-ddd-tlchip__sub">{sub}</span>}
    </a>
  );
}
