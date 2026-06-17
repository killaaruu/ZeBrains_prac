import "@testing-library/jest-dom";

// React Flow uses ResizeObserver internally; jsdom does not provide it.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
