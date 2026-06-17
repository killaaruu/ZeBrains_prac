import {
  Body,
  Controller,
  Get,
  Headers,
  Logger,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from "@nestjs/swagger";
import type { RequestUser } from "@repo/shared";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { Public } from "./decorators/public.decorator";
import { JwksService } from "./jwks.service";
import type { SupabaseAuthEvent } from "./webhooks/supabase-auth.webhook";
import { SupabaseAuthWebhookHandler } from "./webhooks/supabase-auth.webhook";

class CreateProfileDto {
  @ApiProperty({ example: "John" })
  firstName!: string;

  @ApiProperty({ example: "Doe" })
  lastName!: string;
}

class LocalDevLoginDto {
  @ApiProperty({ example: "admin@example.com" })
  email!: string;

  @ApiProperty({ example: "LocalAdmin123!" })
  password!: string;
}

@ApiTags("auth")
@ApiBearerAuth()
@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private authService: AuthService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private webhookHandler: SupabaseAuthWebhookHandler,
    private jwksService: JwksService,
  ) {}

  @Get("me")
  @ApiOperation({ summary: "Get current authenticated user profile" })
  getMe(@CurrentUser() user: RequestUser) {
    return user;
  }

  @Post("register")
  @Public()
  @ApiOperation({ summary: "Create user profile after Supabase signup" })
  async register(@Headers("authorization") authorization: string, @Body() dto: CreateProfileDto) {
    const token = authorization?.split(" ")[1];
    if (!token) throw new UnauthorizedException("Missing token");

    let payload: { sub: string; email: string };

    // Try HMAC secret verification first
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get("SUPABASE_JWT_SECRET"),
      });
      this.logger.log(`Register: HMAC verification OK, sub=${payload.sub}`);
    } catch {
      // HMAC failed — try JWKS (ES256)
      this.logger.debug("Register: HMAC verification failed, trying JWKS");
      const publicKey = await this.jwksService.getSigningKey(token);
      if (!publicKey) {
        this.logger.warn("Register: JWKS key not resolved, rejecting token");
        throw new UnauthorizedException("Invalid token");
      }
      try {
        const verified = this.jwksService.verifyWithPublicKey(token, publicKey);
        payload = verified as typeof payload;
        this.logger.log(`Register: JWKS/ES256 verification OK, sub=${payload.sub}`);
      } catch {
        this.logger.warn("Register: JWKS/ES256 verification also failed");
        throw new UnauthorizedException("Invalid token");
      }
    }

    return this.authService.createProfile(payload.sub, payload.email, dto);
  }

  @Post("local-dev-login")
  @Public()
  @ApiOperation({ summary: "Local development login for seeded admin account" })
  async localDevLogin(@Body() dto: LocalDevLoginDto) {
    if (this.configService.get("LOCAL_DEV_AUTH_ENABLED") !== "true") {
      throw new UnauthorizedException("Local dev auth is disabled");
    }

    const email = this.configService.get<string>("LOCAL_DEV_ADMIN_EMAIL");
    const password = this.configService.get<string>("LOCAL_DEV_ADMIN_PASSWORD");
    const authUid = this.configService.get<string>("LOCAL_DEV_ADMIN_AUTH_UID");
    const secret = this.configService.get<string>("SUPABASE_JWT_SECRET");

    if (!email || !password || !authUid || !secret) {
      throw new UnauthorizedException("Local dev auth is not configured");
    }
    if (dto.email !== email || dto.password !== password) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const accessToken = await this.jwtService.signAsync(
      { sub: authUid, email },
      { secret, expiresIn: "7d" },
    );
    const user = await this.authService.resolveUser(authUid);

    return {
      accessToken,
      refreshToken: accessToken,
      expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      user,
    };
  }

  @Post("webhook")
  @Public()
  @ApiOperation({ summary: "Supabase Auth webhook — activates user on email confirmation" })
  async handleWebhook(
    @Headers("x-webhook-secret") secret: string,
    @Body() event: SupabaseAuthEvent,
  ) {
    const expectedSecret = this.configService.get("SUPABASE_WEBHOOK_SECRET");
    if (!expectedSecret || secret !== expectedSecret) {
      throw new UnauthorizedException("Invalid webhook secret");
    }
    await this.webhookHandler.handle(event);
    return { received: true };
  }
}
