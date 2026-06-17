import type { NestModule } from "../types";
import { ZedLink } from "./ZedLink";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="sb-block" open>
      <summary>{title}</summary>
      <div className="sb-block__body">{children}</div>
    </details>
  );
}

export function SourceBlock({ module }: { module: NestModule }) {
  return (
    <Block title="Source">
      <ZedLink path={module.file.path} line={module.file.line} label={module.file.name} />
    </Block>
  );
}

export function SubModulesBlock({
  module,
  nameById,
}: {
  module: NestModule;
  nameById: Record<string, string>;
}) {
  return (
    <Block title="Sub-modules">
      {module.childIds.length === 0 ? (
        <p className="sb-empty">нет вложенных модулей</p>
      ) : (
        <ul>
          {module.childIds.map((id) => (
            <li key={id}>
              <a className="sb-zed" href={`#/module/${id}`}>
                {nameById[id] ?? id} ↗
              </a>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

export function ImportsBlock({
  module,
  nameById,
}: {
  module: NestModule;
  nameById: Record<string, string>;
}) {
  const hasImports = module.importIds.length > 0 || module.importExternal.length > 0;
  return (
    <Block title="Imports">
      {!hasImports ? (
        <p className="sb-empty">нет импортов</p>
      ) : (
        <ul>
          {module.importIds.map((id) => (
            <li key={id}>
              <a className="sb-zed" href={`#/module/${id}`}>
                {nameById[id] ?? id} ↗
              </a>
            </li>
          ))}
          {module.importExternal.map((name) => (
            <li key={name} className="sb-import-external">
              {name}
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}
