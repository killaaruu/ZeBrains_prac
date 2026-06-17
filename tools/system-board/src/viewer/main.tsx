import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import systemMap from "../system-map.generated.json";
import type { SystemMap } from "../types";
import { App } from "./App";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element not found");

createRoot(rootElement).render(
  <StrictMode>
    <App map={systemMap as SystemMap} />
  </StrictMode>,
);
