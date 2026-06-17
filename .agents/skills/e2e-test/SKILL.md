---
name: e2e-test
description: Create an end-to-end NestJS test for apps/api
argument-hint: "[test-name]"
---

# Create an E2E test

Create an end-to-end test named `$ARGUMENTS` for the API.

## API E2E (NestJS)

`apps/api` already has `"test:e2e"` configured. Create test at `apps/api/test/$ARGUMENTS.e2e-spec.ts`.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('$ARGUMENTS (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /$ARGUMENTS — returns 200', () => {
    return request(app.getHttpServer())
      .get('/$ARGUMENTS')
      .expect(200);
  });
});
```

### Run

```bash
pnpm --filter @repo/api test:e2e
```

---

## Rules

- E2E tests test user flows, not implementation details
- Use `page.getByRole()` and `page.getByLabel()` over CSS selectors — tests resilience
- Mock only external services (third-party APIs), not your own backend
- Do not duplicate unit test coverage in E2E — focus on integration points
