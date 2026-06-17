import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { catchError, Observable, tap, throwError } from "rxjs";
import { MetricsService } from "../metrics/metrics.service";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url } = request;
    const requestId: string | undefined = request.requestId;
    const start = Date.now();

    const prefix = requestId ? `[${requestId}] ` : "";

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(`${prefix}${method} ${url} ${response.statusCode} ${duration}ms`);
        this.metrics.recordRequest(method, url, response.statusCode, duration);
      }),
      catchError((error) => {
        const duration = Date.now() - start;
        const status = error?.status ?? error?.getStatus?.() ?? 500;
        this.logger.warn(`${prefix}${method} ${url} ${status} ${duration}ms`);
        this.metrics.recordRequest(method, url, status, duration);
        return throwError(() => error);
      }),
    );
  }
}
