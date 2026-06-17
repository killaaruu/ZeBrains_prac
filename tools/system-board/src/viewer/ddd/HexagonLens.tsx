import type { DddComponent, DddElementType, DddModule } from "../../ddd-types";

const RINGS: Array<{ key: string; label: string; types: DddElementType[]; cls: string }> = [
  {
    key: "core",
    label: "DDD-ядро (чистый домен)",
    types: ["aggregate", "entity", "valueObject", "event", "policy"],
    cls: "core",
  },
  { key: "app", label: "Application · use-cases / команды", types: ["command"], cls: "app" },
  { key: "adapters", label: "Порты-адаптеры · NestJS-оболочка", types: ["port"], cls: "adapters" },
];

export function HexagonLens({ module }: { module: DddModule }) {
  return (
    <div className="sb-ddd-hex">
      {RINGS.map((ring) => {
        const items = module.components.filter((c) => ring.types.includes(c.type));
        if (items.length === 0) return null;
        return (
          <div className={`sb-ddd-ring sb-ddd-ring--${ring.cls}`} key={ring.key}>
            <div className="sb-ddd-ring__label">{ring.label}</div>
            <div className="sb-ddd-ring__row">
              {items.map((c: DddComponent) => (
                <a className="sb-ddd-rchip" key={c.id} href={`#/ddd/${module.module}/c/${c.id}`}>
                  {c.name}
                </a>
              ))}
            </div>
          </div>
        );
      })}
      {module.externalSystems && module.externalSystems.length > 0 && (
        <div className="sb-ddd-ring sb-ddd-ring--ext">
          <div className="sb-ddd-ring__label">Внешние системы</div>
          <div className="sb-ddd-ring__row">
            {module.externalSystems.map((e) => (
              <span className="sb-ddd-rchip" key={e}>
                {e}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
