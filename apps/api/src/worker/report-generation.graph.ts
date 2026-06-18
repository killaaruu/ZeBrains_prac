import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { Injectable, Logger } from "@nestjs/common";
import {
  type ReportResult,
  type ReportSustainability,
  reportMarketItemSchema,
  reportResultSchema,
  reportSustainabilitySchema,
  ruMarketNotFound,
} from "@repo/shared";
import { z } from "zod";
import { OllamaProvider } from "./ollama.provider";
import { TavilyResearchService, type TavilySourceCandidate } from "./tavily-research.service";

export interface ReportGenerationInput {
  reportId: string;
  userId: string;
  topic: string;
}

const plannerOutputSchema = z.array(z.string().trim().min(1)).min(1);

const analysisSchema = z.object({
  trend_name: z.string().trim().min(1),
  global_market: z.array(reportMarketItemSchema).min(1),
  ru_market: z.union([z.array(reportMarketItemSchema).min(1), z.literal(ruMarketNotFound)]),
});

type ReportAnalysis = z.infer<typeof analysisSchema>;

const ReportGenerationState = Annotation.Root({
  reportId: Annotation<string>(),
  userId: Annotation<string>(),
  topic: Annotation<string>(),
  subQueries: Annotation<string[]>(),
  rawSources: Annotation<TavilySourceCandidate[]>(),
  validatedSources: Annotation<TavilySourceCandidate[]>(),
  analysis: Annotation<ReportAnalysis>(),
  sustainability: Annotation<ReportSustainability>(),
  report: Annotation<ReportResult>(),
});

type GraphState = typeof ReportGenerationState.State;

/**
 * LangGraph wiring for the TrendScout report pipeline.
 *
 * The node internals stay intentionally lightweight in this issue: the goal here
 * is to define the shared state, enforce the end-to-end node sequence, and make
 * the assembled contract-valid JSON visible in logs. Later issues can deepen the
 * behavior of each node without changing the graph topology.
 */
@Injectable()
export class ReportGenerationGraph {
  private readonly logger = new Logger(ReportGenerationGraph.name);

  constructor(
    private readonly ollamaProvider: OllamaProvider,
    private readonly tavilyResearchService: TavilyResearchService,
  ) {}

  async run(input: ReportGenerationInput): Promise<ReportResult> {
    const startedAt = Date.now();

    const graph = new StateGraph(ReportGenerationState)
      .addNode("planner", (state: GraphState) => this.plan(state))
      .addNode("researcher", (state: GraphState) => this.research(state))
      .addNode("link-validator", (state: GraphState) => this.validateLinks(state))
      .addNode("analyst", (state: GraphState) => this.analyze(state))
      .addNode("sustainability-scorer", (state: GraphState) => this.scoreSustainability(state))
      .addNode("assembler", (state: GraphState) => this.assemble(state))
      .addEdge(START, "planner")
      .addEdge("planner", "researcher")
      .addEdge("researcher", "link-validator")
      .addEdge("link-validator", "analyst")
      .addEdge("analyst", "sustainability-scorer")
      .addEdge("sustainability-scorer", "assembler")
      .addEdge("assembler", END)
      .compile();

    const state = await graph.invoke(input);

    this.logger.log(
      `Assembled report ${input.reportId} for user ${input.userId} in ${Date.now() - startedAt}ms`,
    );

    return state.report;
  }

  /**
   * Planner decomposes the user topic into targeted search sub-queries so the
   * downstream research step has explicit retrieval intents instead of one broad prompt.
   */
  private async plan(state: GraphState): Promise<Pick<GraphState, "subQueries">> {
    const subQueries = await this.ollamaProvider.generate(
      [
        "Planner",
        "Break the topic into concrete search sub-queries for a trend report.",
        "Return a JSON array of short query strings.",
        `Topic: ${state.topic}`,
      ].join("\n"),
      plannerOutputSchema,
    );

    return { subQueries };
  }

  /**
   * Researcher fans out across the planner sub-queries through Tavily, then returns
   * a deduped candidate-source set for downstream validation and analysis.
   */
  private async research(state: GraphState): Promise<Pick<GraphState, "rawSources">> {
    const rawSources = await this.tavilyResearchService.search(state.subQueries);

    return { rawSources };
  }

  /**
   * Link-Validator enforces a basic URL sanity gate in the wiring issue so later nodes
   * never see obviously broken links. A later issue can replace this with live HEAD/GET checks.
   */
  private validateLinks(state: GraphState): Pick<GraphState, "validatedSources"> {
    return {
      validatedSources: state.rawSources.filter((source) => this.isHttpUrl(source.url)),
    };
  }

  /**
   * Analyst turns validated evidence into the market breakdown required by the report
   * contract, leaving sustainability scoring to the dedicated downstream node.
   */
  private async analyze(state: GraphState): Promise<Pick<GraphState, "analysis">> {
    const analysis = await this.ollamaProvider.generate(
      [
        "Analyst",
        "Split the validated evidence into global and Russia market findings.",
        "Return JSON with trend_name, global_market, and ru_market only.",
        `Topic: ${state.topic}`,
        `Validated sources: ${JSON.stringify(state.validatedSources)}`,
      ].join("\n"),
      analysisSchema,
    );

    return { analysis };
  }

  /**
   * Sustainability-Scorer produces the 1..10 score plus arguments so the assembler
   * can merge a fully contract-valid report from already-structured upstream state.
   */
  private async scoreSustainability(
    state: GraphState,
  ): Promise<Pick<GraphState, "sustainability">> {
    const sustainability = await this.ollamaProvider.generate(
      [
        "Sustainability-Scorer",
        "Assess the trend's sustainability from 1 to 10.",
        "Return JSON with score, arguments_for, and arguments_against.",
        `Topic: ${state.topic}`,
        `Analysis: ${JSON.stringify(state.analysis)}`,
      ].join("\n"),
      reportSustainabilitySchema,
    );

    return { sustainability };
  }

  /**
   * Assembler is the final contract gate. It merges the upstream state, validates the
   * finished report against the shared Zod schema, and logs the JSON payload verbatim.
   */
  private async assemble(state: GraphState): Promise<Pick<GraphState, "report">> {
    const report = await this.ollamaProvider.generate(
      [
        "Assembler",
        "Return the final TrendScout report JSON.",
        "Use the provided analysis and sustainability fields as the source of truth.",
        `Analysis: ${JSON.stringify(state.analysis)}`,
        `Sustainability: ${JSON.stringify(state.sustainability)}`,
      ].join("\n"),
      reportResultSchema,
    );

    this.logger.log(JSON.stringify(report));
    return { report };
  }

  private isHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }
}
