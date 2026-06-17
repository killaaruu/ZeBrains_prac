import { describe, expect, it } from "vitest";
import { getSidebarData, sidebarData } from "./sidebar-data";

describe("sidebarData", () => {
  it("exposes the demo routes under the General group", () => {
    const general = sidebarData.navGroups.find((group) => group.title === "General");

    expect(general).toBeDefined();
    expect(general?.items).toContainEqual(
      expect.objectContaining({ title: "Dashboard", url: "/dashboard" }),
    );
    expect(general?.items).toContainEqual(
      expect.objectContaining({ title: "Example CRUD", url: "/example" }),
    );
    expect(general?.items).toContainEqual(
      expect.objectContaining({ title: "Health", url: "/health" }),
    );
  });

  it("returns non-empty nav groups in production", () => {
    const productionSidebarData = getSidebarData(true);
    expect(productionSidebarData.navGroups.length).toBeGreaterThan(0);
  });
});
