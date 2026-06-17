import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHealthTestApp } from "./setup-e2e";

describe("Health (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createHealthTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /health returns 200 with status ok", async () => {
    const response = await request(app.getHttpServer()).get("/health").expect(200);

    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("info");
    expect(response.body.info).toHaveProperty("database");
    expect(response.body.info.database).toHaveProperty("status", "up");
  });

  it("GET /health/metrics returns process metrics", async () => {
    const response = await request(app.getHttpServer()).get("/health/metrics").expect(200);

    expect(response.body).toHaveProperty("memoryUsage");
    expect(response.body.memoryUsage).toHaveProperty("rss");
    expect(response.body.memoryUsage).toHaveProperty("heapTotal");
    expect(response.body.memoryUsage).toHaveProperty("heapUsed");
    expect(response.body).toHaveProperty("uptime");
    expect(typeof response.body.uptime).toBe("number");
    expect(response.body).toHaveProperty("timestamp");
  });
});
