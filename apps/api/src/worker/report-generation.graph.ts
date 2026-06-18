import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { Injectable, Logger } from "@nestjs/common";
import { type ReportResult, ruMarketNotFound } from "@repo/shared";

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

  async run(input: ReportGenerationInput): Promise<ReportResult> {
    const startedAt = Date.now();
    const graph = new StateGraph(ReportGenerationState)
      .addNode("assemble", (state: typeof ReportGenerationState.State) => ({
        result: this.assemblePlaceholderReport(state.topic),
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

  private assemblePlaceholderReport(topic: string): ReportResult {
    return {
      trend_name: topic,
      global_market: [
        {
          product: topic,
          company: "Not analyzed yet",
          effects:
            "Worker scaffold accepted the job; full research graph is implemented in later M4 issues.",
          sources: ["https://example.com"],
        },
      ],
      ru_market: ruMarketNotFound,
      sustainability: {
        score: 1,
        arguments_for: ["The worker pipeline is available for asynchronous report generation."],
        arguments_against: [
          "Research, validation, and scoring nodes are not implemented in this issue.",
        ],
      },
    };
  }
}
