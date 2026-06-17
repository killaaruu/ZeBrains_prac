import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException ? exception.message : "Internal Server Error";

    const stack = exception instanceof Error ? exception.stack : undefined;
    const requestId: string | undefined = request.requestId;
    const prefix = requestId ? `[${requestId}] ` : "";

    this.logger.error(
      `${prefix}${request.method} ${request.url} ${status} — ${message}`,
      stack ?? "",
    );

    // Server-side failures (5xx) are logged above. Wire an error reporter here
    // (e.g. Sentry/Rollbar) if your product needs one — 4xx are client errors
    // and should not be forwarded.

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
      ...(requestId ? { requestId } : {}),
    });
  }
}
