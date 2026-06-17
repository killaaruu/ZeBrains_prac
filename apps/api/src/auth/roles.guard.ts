import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RequestUser, RoleName } from "@repo/shared";
import { MIN_ROLE_KEY, ROLE_HIERARCHY, ROLES_KEY } from "./types";

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const minRole = this.reflector.getAllAndOverride<RoleName>(MIN_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles && minRole === undefined) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user) throw new ForbiddenException();

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      this.logger.warn(
        `Access denied for user ${user.id}: role '${user.role}' not in [${requiredRoles.join(", ")}]`,
      );
      throw new ForbiddenException();
    }

    if (minRole !== undefined) {
      if (ROLE_HIERARCHY[user.role] < ROLE_HIERARCHY[minRole]) {
        this.logger.warn(
          `Access denied for user ${user.id}: role '${user.role}' below minimum '${minRole}'`,
        );
        throw new ForbiddenException();
      }
    }

    return true;
  }
}
