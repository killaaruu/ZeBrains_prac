import Markdown from "react-markdown";
import type { NestModule } from "../types";
import { ImportsBlock, SourceBlock, SubModulesBlock } from "./module-blocks";

export function ModuleDetail({ modules, id }: { modules: NestModule[]; id: string }) {
  const module = modules.find((m) => m.id === id);
  const nameById = Object.fromEntries(modules.map((m) => [m.id, m.name]));

  if (!module) {
    return (
      <div className="sb-detail">
        <a className="sb-back" href="#/modules">
          ← Modules
        </a>
        <p className="sb-empty">Модуль «{id}» не найден</p>
      </div>
    );
  }

  return (
    <div className="sb-detail">
      <a className="sb-back" href="#/modules">
        ← Modules
      </a>
      <header className="sb-detail__head">
        <h1>{module.name}</h1>
        <span className="sb-detail__id">{module.id}</span>
        {module.status && (
          <span className={`sb-status sb-status--${module.status}`}>{module.status}</span>
        )}
      </header>

      {module.architectureMd && (
        <details className="sb-block" open>
          <summary>Architecture</summary>
          <div className="sb-block__body">
            <Markdown>{module.architectureMd}</Markdown>
          </div>
        </details>
      )}

      <SourceBlock module={module} />

      <details className="sb-block" open>
        <summary>Tests</summary>
        <div className="sb-block__body">
          <p className="sb-tests__count">
            {module.tests.total} вызовов в {module.tests.files} файлах
          </p>
        </div>
      </details>

      <SubModulesBlock module={module} nameById={nameById} />
      <ImportsBlock module={module} nameById={nameById} />

      {module.docs.length > 0 && (
        <details className="sb-block" open>
          <summary>Docs</summary>
          <div className="sb-block__body">
            <ul>
              {module.docs.map((doc) => (
                <li key={doc.path}>
                  <a className="sb-zed" href={`zed://file/${doc.path.replace(/^\//, "")}`}>
                    {doc.title} ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}

      {module.integrations.length > 0 && (
        <details className="sb-block" open>
          <summary>Integrations</summary>
          <div className="sb-block__body">
            <ul>
              {module.integrations.map((i) => (
                <li key={`${i.target}-${i.kind}`}>
                  {i.target} — {i.kind}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </div>
  );
}
