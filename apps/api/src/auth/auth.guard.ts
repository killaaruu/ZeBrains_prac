import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  Logger,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { JwksService } from "./jwks.service";
import { ServiceTokenService } from "./service-token.service";
import { IS_PUBLIC_KEY } from "./types";

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private reflector: Reflector,
    private authService: AuthService,
    private serviceTokenService: ServiceTokenService,
    @Optional() @Inject(JwksService) private jwksService?: JwksService,
  ) {
    this.logger.log(`AuthGuard initialized, jwksService=${jwksService ? "present" : "NULL"}`);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      this.logger.warn(`No Bearer token in request ${request.method} ${request.url}`);
      throw new UnauthorizedException();
    }

    this.logger.debug(
      `Auth attempt: ${request.method} ${request.url}, token=${token.substring(0, 20)}...`,
    );

    // Try HMAC secret verification first
    const hmacSecret = this.configService.get("SUPABASE_JWT_SECRET");
    this.logger.debug(`HMAC secret configured: ${hmacSecret ? "yes" : "NO"}`);
    try {
      const payload = await this.jwtService.verifyAsync(token, { secret: hmacSecret });
      this.logger.log(`HMAC verification OK, sub=${payload.sub}`);
      request.user = await this.authService.resolveUser(payload.sub);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.logger.warn(`AuthService rejected user: ${error.message}`);
        throw error;
      }
      this.logger.debug(
        `HMAC verification failed: ${error instanceof Error ? error.message : error}`,
      );
    }

    // Try JWKS-based verification (ES256 asymmetric tokens)
    this.logger.debug(`JWKS service available: ${this.jwksService ? "yes" : "NO"}`);
    if (this.jwksService) {
      const publicKey = await this.jwksService.getSigningKey(token);
      this.logger.debug(`JWKS public key resolved: ${publicKey ? "yes" : "NO"}`);
      if (publicKey) {
        try {
          const payload = this.jwksService.verifyWithPublicKey(token, publicKey);
          this.logger.log(`JWKS/ES256 verification OK, sub=${payload.sub}`);
          request.user = await this.authService.resolveUser(payload.sub as string);
          return true;
        } catch (error) {
          if (error instanceof UnauthorizedException) {
            this.logger.warn(`AuthService rejected user after JWKS verify: ${error.message}`);
            throw error;
          }
          this.logger.error(
            `JWKS/ES256 verification failed: ${error instanceof Error ? error.message : error}`,
          );
        }
      }
    }

    // Try service token
    const serviceUser = this.serviceTokenService.resolve(token);
    if (serviceUser) {
      this.logger.log(`Service token auth OK, id=${serviceUser.id}`);
      request.user = serviceUser;
      return true;
    }

    this.logger.warn(
      `All auth methods failed for ${request.method} ${request.url}. Returning 401.`,
    );
    throw new UnauthorizedException();
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
