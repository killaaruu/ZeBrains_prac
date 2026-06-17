import { useEffect, useState } from "react";

export type DddTab = "overview" | "graph" | "timeline" | "hexagon";

export type Route =
  | { name: "modules" }
  | { name: "module"; id: string }
  | { name: "ddd-index" }
  | { name: "ddd"; id: string; tab: DddTab }
  | { name: "ddd-component"; id: string; componentId: string };

const DDD_TABS: DddTab[] = ["overview", "graph", "timeline", "hexagon"];

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, "");
  if (path === "/modules") return { name: "modules" };
  if (path.startsWith("/module/")) {
    const id = path.slice("/module/".length);
    if (id) return { name: "module", id };
  }
  if (path.startsWith("/ddd/")) {
    const rest = path.slice("/ddd/".length).split("/");
    const id = rest[0];
    if (id) {
      if (rest[1] === "c" && rest[2]) {
        return { name: "ddd-component", id, componentId: rest.slice(2).join("/") };
      }
      const tab = (rest[1] ?? "overview") as DddTab;
      return { name: "ddd", id, tab: DDD_TABS.includes(tab) ? tab : "overview" };
    }
  }
  return { name: "ddd-index" };
}

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
