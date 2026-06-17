import { Injectable, Logger } from "@nestjs/common";

export interface MetricsSnapshot {
  totalRequests: number;
  totalErrors: number;
  errorsByStatus: Record<number, number>;
  avgResponseTimeMs: number;
  uptimeSeconds: number;
}

const ERROR_RATE_THRESHOLD = 50;
const MIN_REQUESTS_FOR_ALERT = 10;

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private readonly startTime = Date.now();

  private totalRequests = 0;
  private totalErrors = 0;
  private totalResponseTimeMs = 0;
  private errorsByStatus: Record<number, number> = {};

  recordRequest(_method: string, _url: string, statusCode: number, durationMs: number): void {
    this.totalRequests++;
    this.totalResponseTimeMs += durationMs;

    if (statusCode >= 400) {
      this.totalErrors++;
      this.errorsByStatus[statusCode] = (this.errorsByStatus[statusCode] ?? 0) + 1;
    }

    if (this.totalRequests >= MIN_REQUESTS_FOR_ALERT) {
      const errorRate = this.getErrorRate();
      if (errorRate > ERROR_RATE_THRESHOLD) {
        this.logger.warn(
          `High error rate: ${errorRate.toFixed(1)}% (${this.totalErrors}/${this.totalRequests} requests)`,
        );
      }
    }
  }

  getSnapshot(): MetricsSnapshot {
    return {
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      errorsByStatus: { ...this.errorsByStatus },
      avgResponseTimeMs:
        this.totalRequests > 0 ? Math.round(this.totalResponseTimeMs / this.totalRequests) : 0,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  getErrorRate(): number {
    if (this.totalRequests === 0) return 0;
    return (this.totalErrors / this.totalRequests) * 100;
  }
}
