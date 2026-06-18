import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { db } from "@repo/db-backend";
import { validateEnv } from "../config/env.validation";
import { QueueModule } from "../queue/queue.module";
import { OllamaProvider } from "./ollama.provider";
import { ReportGenerationGraph } from "./report-generation.graph";
import { ReportGenerationProcessor } from "./report-generation.processor";
import { TavilyResearchService } from "./tavily-research.service";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), QueueModule],
  providers: [
    { provide: "DRIZZLE_DB", useValue: db },
    OllamaProvider,
    TavilyResearchService,
    ReportGenerationGraph,
    ReportGenerationProcessor,
  ],
})
export class WorkerModule {}
