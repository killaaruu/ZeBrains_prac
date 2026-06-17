// Lazy import utilities to defer module loading until needed
export async function loadUserEvent() {
  const userEvent = await import("@testing-library/user-event");
  return userEvent.default;
}

export async function loadWaitFor() {
  const { waitFor } = await import("@testing-library/react");
  return waitFor;
}
