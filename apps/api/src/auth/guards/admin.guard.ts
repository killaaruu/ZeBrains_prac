import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import type { RequestUser } from "@repo/shared";

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly logger = new Logger(AdminGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;
    if (!user || user.role !== "admin") {
      this.logger.warn(
        `Admin access denied for user ${user?.id ?? "unknown"} with role '${user?.role ?? "none"}'`,
      );
      throw new ForbiddenException();
    }
    return true;
  }
}
