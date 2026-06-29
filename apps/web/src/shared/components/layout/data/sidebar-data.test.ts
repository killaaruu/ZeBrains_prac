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

  it("keeps template example navigation out of production user surfaces", () => {
    const productionSidebarData = getSidebarData(true);
    const productionTitles = productionSidebarData.navGroups.flatMap((group) =>
      group.items.map((item) => item.title),
    );

    expect(productionTitles).not.toContain("Example CRUD");
  });

  it("uses TrendScout product metadata instead of template placeholders", () => {
    expect(sidebarData.user.email).toBe("demo@trendscout.app");
    expect(sidebarData.teams).toEqual([
      expect.objectContaining({
        name: "TrendScout",
        plan: "Research Workspace",
      }),
    ]);
  });
});
