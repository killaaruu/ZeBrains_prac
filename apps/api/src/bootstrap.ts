import "dotenv/config";
import { resolve } from "node:path";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { runMigrations } from "@repo/db-backend";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/filters/http-exception.filter";
import { LoggingInterceptor } from "./common/interceptors/logging.interceptor";
import { MetricsService } from "./common/metrics/metrics.service";
import { shouldSkipStartupMigrations } from "./migration-gate";

export async function bootstrap() {
  const logger = new Logger("Bootstrap");

  // Run pending DB migrations before accepting traffic (see ADR-002).
  //
  // Path resolution:
  //   - MIGRATIONS_DIR env var is set explicitly in docker-compose.yml (dev) and
  //     Dockerfile (prod) to the correct absolute path inside the container.
  //   - Fallback: relative to __dirname (webpack dist/) → ../migrations, which
  //     matches the prod Docker layout where migrations are COPY-ed to /app/migrations.
  if (shouldSkipStartupMigrations(process.env)) {
    logger.warn(
      "Skipping startup DB migrations (API_SKIP_MIGRATIONS=true) — DB assumed already migrated",
    );
  } else {
    const migrationsFolder = process.env.MIGRATIONS_DIR ?? resolve(__dirname, "../migrations");
    logger.log(`Running migrations from ${migrationsFolder}`);
    await runMigrations(migrationsFolder);
    logger.log("Migrations applied");
  }

  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn", "debug", "verbose"],
  });

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, shutting down`);
    await app.close();
    process.exit(0);
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));

  app.enableCors();

  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new LoggingInterceptor(metricsService));
  app.useGlobalFilters(new GlobalExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle("API")
    .setDescription("API documentation")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = Number(process.env.PORT) || 3111;
  await app.listen(port, "0.0.0.0");
  logger.log(`Application is running on ${port} port`);
}
