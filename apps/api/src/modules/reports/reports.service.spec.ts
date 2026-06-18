import { NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GENERATE_REPORT_JOB } from "../../queue/queue.constants";
import { mapReportRow, ReportsService } from "./reports.service";

const queuedRow = {
  id: "00000000-0000-4000-8000-000000000000",
  userId: "11111111-1111-4111-8111-111111111111",
  topic: "AI coding assistants",
  status: "queued" as const,
  result: null,
  error: null,
  createdAt: new Date("2026-06-18T00:00:00.000Z"),
  updatedAt: new Date("2026-06-18T00:01:00.000Z"),
};

function createDbMock(rows: unknown[] = []) {
  const selectLimit = vi.fn().mockResolvedValue(rows);
  const selectWhere = vi.fn(() => ({ limit: selectLimit, orderBy: selectOrderBy }));
  const selectOrderBy = vi.fn().mockResolvedValue(rows);
  const selectFrom = vi.fn(() => ({ where: selectWhere, orderBy: selectOrderBy }));
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn(() => ({ returning }));

  return {
    db: {
      insert: vi.fn(() => ({ values })),
      select: vi.fn(() => ({ from: selectFrom })),
    },
    fns: { returning, selectFrom, selectLimit, selectOrderBy, selectWhere, values },
  };
}

describe("mapReportRow", () => {
  it("maps a DB row to the shared report contract", () => {
    expect(mapReportRow(queuedRow)).toEqual({
      id: queuedRow.id,
      userId: "11111111-1111-4111-8111-111111111111",
      topic: "AI coding assistants",
      status: "queued",
      result: null,
      error: null,
      createdAt: "2026-06-18T00:00:00.000Z",
      updatedAt: "2026-06-18T00:01:00.000Z",
    });
  });
});

describe("ReportsService", () => {
  let queue: { add: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    queue = { add: vi.fn().mockResolvedValue({ id: "job-1" }) };
  });

  it("creates a queued report and enqueues generation", async () => {
    const { db, fns } = createDbMock([queuedRow]);
    const service = new ReportsService(db as never, queue as never);

    await expect(
      service.create({ topic: "AI coding assistants" }, "11111111-1111-4111-8111-111111111111"),
    ).resolves.toEqual({ id: queuedRow.id });

    expect(fns.values).toHaveBeenCalledWith({
      topic: "AI coding assistants",
      userId: "11111111-1111-4111-8111-111111111111",
    });
    expect(queue.add).toHaveBeenCalledWith(GENERATE_REPORT_JOB, {
      reportId: queuedRow.id,
      topic: "AI coding assistants",
      userId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("lists reports scoped to the current user", async () => {
    const { db, fns } = createDbMock([queuedRow]);
    const service = new ReportsService(db as never, queue as never);

    await expect(service.list("11111111-1111-4111-8111-111111111111")).resolves.toEqual([
      mapReportRow(queuedRow),
    ]);
    expect(fns.selectWhere).toHaveBeenCalledOnce();
    expect(fns.selectOrderBy).toHaveBeenCalledOnce();
  });

  it("throws not found when a report is not owned by the current user", async () => {
    const { db } = createDbMock([]);
    const service = new ReportsService(db as never, queue as never);

    await expect(
      service.getById(
        "00000000-0000-4000-8000-000000000000",
        "11111111-1111-4111-8111-111111111111",
      ),
    ).rejects.toThrow(NotFoundException);
  });
});
