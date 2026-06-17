import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request as ExpressRequest, NextFunction, Response } from "express";

interface RequestWithId extends ExpressRequest {
  requestId?: string;
}

export const requestIdStorage = new AsyncLocalStorage<string>();

export function getRequestId(): string | undefined {
  return requestIdStorage.getStore();
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const requestId = (req.headers["x-request-id"] as string | undefined) || randomUUID();

    req.requestId = requestId;
    res.setHeader("X-Request-Id", requestId);

    requestIdStorage.run(requestId, () => next());
  }
}
