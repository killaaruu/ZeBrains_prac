import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { Injectable, Logger } from "@nestjs/common";
import { type ReportResult, reportResultSchema } from "@repo/shared";
import { OllamaProvider } from "./ollama.provider";

export interface ReportGenerationInput {
  reportId: string;
  userId: string;
  topic: string;
}

const ReportGenerationState = Annotation.Root({
  reportId: Annotation<string>(),
  userId: Annotation<string>(),
  topic: Annotation<string>(),
  result: Annotation<ReportResult>(),
});

@Injectable()
export class ReportGenerationGraph {
  private readonly logger = new Logger(ReportGenerationGraph.name);

  constructor(private readonly ollamaProvider: OllamaProvider) {}

  async run(input: ReportGenerationInput): Promise<ReportResult> {
    const startedAt = Date.now();
    const graph = new StateGraph(ReportGenerationState)
      .addNode("assemble", async (state: typeof ReportGenerationState.State) => ({
        result: await this.ollamaProvider.generate(
          this.buildAssemblerPrompt(state.topic),
          reportResultSchema,
        ),
      }))
      .addEdge(START, "assemble")
      .addEdge("assemble", END)
      .compile();

    const state = await graph.invoke(input);
    this.logger.log(
      `Assembled report ${input.reportId} for user ${input.userId} in ${Date.now() - startedAt}ms`,
    );
    return state.result;
  }

  private buildAssemblerPrompt(topic: string): string {
    return [
      "Return a TrendScout report as JSON.",
      "Use the provided topic as the trend under analysis.",
      `Topic: ${topic}`,
    ].join("\n");
  }
}
