import type { CreateReport, RequestUser } from "@repo/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReportsController } from "./reports.controller";
import type { ReportsService } from "./reports.service";

describe("ReportsController", () => {
  let controller: ReportsController;
  let service: {
    create: ReturnType<typeof vi.fn>;
    getById: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
  };

  const user: RequestUser = {
    id: "11111111-1111-4111-8111-111111111111",
    email: "user@example.com",
    firstName: "Test",
    lastName: "User",
    role: "user",
    status: "active",
  };

  beforeEach(() => {
    service = {
      create: vi.fn().mockResolvedValue({ id: "00000000-0000-4000-8000-000000000000" }),
      getById: vi.fn(),
      list: vi.fn(),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    controller = new ReportsController(service as unknown as ReportsService);
  });

  it("creates a queued report for the current user", async () => {
    const body: CreateReport = { topic: "AI coding assistants" };

    await expect(controller.create(user, body)).resolves.toEqual({
      id: "00000000-0000-4000-8000-000000000000",
    });
    expect(service.create).toHaveBeenCalledWith(body, user.id);
  });

  it("lists only the current user's reports", async () => {
    service.list.mockResolvedValue([]);

    await expect(controller.list(user)).resolves.toEqual([]);
    expect(service.list).toHaveBeenCalledWith(user.id);
  });

  it("fetches one report scoped to the current user", async () => {
    service.getById.mockResolvedValue({ id: "report-1" });

    await expect(controller.getById(user, "report-1")).resolves.toEqual({ id: "report-1" });
    expect(service.getById).toHaveBeenCalledWith("report-1", user.id);
  });

  it("deletes one report scoped to the current user", async () => {
    await expect(controller.remove(user, "report-1")).resolves.toBeUndefined();
    expect(service.remove).toHaveBeenCalledWith("report-1", user.id);
  });
});
