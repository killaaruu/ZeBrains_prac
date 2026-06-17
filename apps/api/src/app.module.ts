import { type MiddlewareConsumer, Module, type NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthGuard } from "./auth/auth.guard";
import { AuthModule } from "./auth/auth.module";
import { RolesGuard } from "./auth/roles.guard";
import { RequestContextModule } from "./common/context/request-context.module";
import { MetricsModule } from "./common/metrics/metrics.module";
import { RequestIdMiddleware } from "./common/middleware/request-id.middleware";
import { validateEnv } from "./config/env.validation";
import { HealthModule } from "./health/health.module";
import { ExampleModule } from "./modules/example/example.module";
import { QueueModule } from "./queue/queue.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ name: "default", ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    RequestContextModule,
    MetricsModule,
    AuthModule,
    HealthModule,
    ExampleModule,
    QueueModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
