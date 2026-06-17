import type { SystemMap } from "../types";
import { ComponentPage } from "./ddd/ComponentPage";
import { DddIndex } from "./ddd/DddIndex";
import { DddModulePage } from "./ddd/DddModulePage";
import { ModuleDetail } from "./ModuleDetail";
import { ModuleGrid } from "./ModuleGrid";
import { Navbar, type NavTab } from "./Navbar";
import { useHashRoute } from "./use-hash-route";
import "./styles.css";

function activeTab(routeName: string): NavTab {
  if (routeName === "modules" || routeName === "module") return "modules";
  return "ddd";
}

export function App({ map }: { map: SystemMap }) {
  const route = useHashRoute();
  const ddd = map.dddModules ?? [];
  const dddModule =
    route.name === "ddd" || route.name === "ddd-component"
      ? ddd.find((m) => m.module === route.id)
      : undefined;

  return (
    <div className="sb-app">
      <Navbar active={activeTab(route.name)} />
      <main className="sb-main">
        {route.name === "modules" && <ModuleGrid modules={map.modules} />}
        {route.name === "module" && <ModuleDetail modules={map.modules} id={route.id} />}
        {route.name === "ddd-index" && <DddIndex modules={ddd} />}
        {route.name === "ddd" &&
          (dddModule ? (
            <DddModulePage module={dddModule} tab={route.tab} />
          ) : (
            <MissingModule id={route.id} />
          ))}
        {route.name === "ddd-component" &&
          (dddModule ? (
            <ComponentPage module={dddModule} componentId={route.componentId} />
          ) : (
            <MissingModule id={route.id} />
          ))}
      </main>
    </div>
  );
}

function MissingModule({ id }: { id: string }) {
  return (
    <div className="sb-detail">
      <a className="sb-back" href="#/ddd">
        ← DDD
      </a>
      <p className="sb-empty">DDD-модуль «{id}» не найден</p>
    </div>
  );
}
