import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { RequestUser } from "@repo/shared";

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
