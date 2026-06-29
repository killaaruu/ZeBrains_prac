import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { BullBoardModule } from "@bull-board/nestjs";
import { BullModule } from "@nestjs/bullmq";
import { Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REPORT_GENERATION_QUEUE } from "./queue.constants";

const logger = new Logger("QueueModule");

function parseRedisUrl(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    db: url.pathname ? Number(url.pathname.slice(1)) || 0 : 0,
  };
}

/**
 * Product queue registration lives here. The Bull Board dashboard is mounted at `/queues`.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.get<string>("REDIS_URL");
        const connection = redisUrl ? parseRedisUrl(redisUrl) : { host: "localhost", port: 6379 };

        logger.log(`BullMQ connecting to Redis at ${connection.host}:${connection.port}`);
        return { connection };
      },
    }),
    BullModule.registerQueue({ name: REPORT_GENERATION_QUEUE }),
    BullBoardModule.forRoot({ route: "/queues", adapter: ExpressAdapter }),
    BullBoardModule.forFeature({ name: REPORT_GENERATION_QUEUE, adapter: BullMQAdapter }),
  ],
})
export class QueueModule {}
