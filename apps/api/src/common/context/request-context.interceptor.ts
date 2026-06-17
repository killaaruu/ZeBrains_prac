import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import type { Request } from "express";
import { ClsService } from "nestjs-cls";
import { Observable } from "rxjs";
import { extractIp, resolveActor } from "./actor";
import type { RequestContextStore } from "./request-context.types";

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestContextInterceptor.name);

  constructor(private readonly cls: ClsService<RequestContextStore>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === "http") {
      const req = context.switchToHttp().getRequest<Request>();
      const actor = resolveActor(req);
      this.cls.set("actor", actor);
      this.cls.set("ip", extractIp(req));
      const ua = req.headers["user-agent"];
      this.cls.set("userAgent", typeof ua === "string" ? ua : null);
      this.logger.debug(`actor.kind=${actor.kind} actor.id=${actor.id ?? "null"}`);
    }
    return next.handle();
  }
}
