import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { db } from "@repo/db-backend";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { JwksService } from "./jwks.service";
import { RolesGuard } from "./roles.guard";
import { ServiceTokenService } from "./service-token.service";
import { DB_TOKEN } from "./types";
import { SupabaseAuthWebhookHandler } from "./webhooks/supabase-auth.webhook";

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("SUPABASE_JWT_SECRET"),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    { provide: DB_TOKEN, useValue: db },
    AuthService,
    AuthGuard,
    JwksService,
    RolesGuard,
    ServiceTokenService,
    SupabaseAuthWebhookHandler,
  ],
  exports: [AuthGuard, RolesGuard, AuthService, ServiceTokenService, JwksService, JwtModule],
})
export class AuthModule {}
