---
name: e2e-test
description: Create a NestJS end-to-end (supertest) test in apps/api/test/. Use when adding integration or e2e coverage for an API endpoint, verifying the full HTTP→service→DB request flow, or when the user asks to "write an e2e test", "add integration tests for the API", or "test the endpoint end to end".
---

# Create an E2E test

Create an end-to-end test for the API. Take the test name from the user's request (or the endpoint/flow under test); below, `<test>` stands for that name. E2E here means driving the
**HTTP surface** of a NestJS app with `supertest` — booting (a slice of) `AppModule`,
issuing real requests, and asserting on status codes, response bodies, and contracts.
There is no browser and no DOM involved.

## API E2E (NestJS)

`apps/api` already has `"test:e2e"` configured (`vitest run --config ./test/vitest-e2e.config.ts`).
Create the test at `apps/api/test/<test>.e2e-spec.ts` (the config's `include` glob is
`test/**/*.e2e-spec.ts`).

Prefer composing a small test app from a shared helper (see `test/setup-e2e.ts`,
e.g. `createHealthTestApp`) and overriding only the providers you need to mock — that keeps
the boot fast and the DB out of the picture unless the flow under test really needs it.

```typescript
import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("<test> (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Mock only infra / external services, e.g. the DB or a third-party client:
      // .overrideProvider("DRIZZLE_DB").useValue(mockDb)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /<test> — returns 200", async () => {
    const response = await request(app.getHttpServer()).get("/<test>").expect(200);

    expect(response.body).toHaveProperty("status", "ok");
  });
});
```

### Run

```bash
make local-e2e
```

`make local-e2e` provisions local infra (Postgres + Redis) and runs the suite against the
prepared environment. To run the raw script directly: `pnpm --filter @repo/api test:e2e`.

> **SWC is required.** `vitest-e2e.config.ts` registers `unplugin-swc` so that
> `emitDecoratorMetadata` is honored when `AppModule` is loaded. Without it, NestJS DI
> metadata is stripped and the app fails to bootstrap with "can't resolve dependencies"
> errors. Don't replace the SWC plugin with esbuild/ts transforms in the e2e config.

---

## Rules

- E2E tests test HTTP flows end-to-end (request → controller → service → response), not
  implementation details — assert on **status codes, response bodies, and contracts**.
- Use `supertest`: `request(app.getHttpServer()).get("/path").expect(200)`, then assert on
  `response.body`. There are no `page.getByRole()` / browser selectors here — this is API,
  not DOM.
- Mock only external services (DB, third-party APIs) via `.overrideProvider(...)`, not your
  own controllers/services — the point is to exercise the real wiring.
- Do not duplicate unit test coverage in E2E — focus on integration points and the
  public HTTP contract.
