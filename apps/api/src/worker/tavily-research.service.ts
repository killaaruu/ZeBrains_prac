import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { z } from "zod";

const TAVILY_BASE_URL = "https://api.tavily.com";
const TAVILY_SEARCH_PATH = "/search";
const TAVILY_MAX_RESULTS = 5;

export const TAVILY_NODE_TIME_BUDGET_MS = 8_000;

const tavilyResultSchema = z.object({
  title: z.string().trim().min(1),
  url: z.string().trim().min(1),
  content: z.string().trim().min(1),
});

const tavilySearchResponseSchema = z.object({
  results: z.array(tavilyResultSchema),
});

export type TavilySourceCandidate = {
  title: string;
  url: string;
  snippet: string;
};

@Injectable()
export class TavilyResearchService {
  private readonly logger = new Logger(TavilyResearchService.name);

  constructor(private readonly configService: ConfigService) {}

  async search(subQueries: string[]): Promise<TavilySourceCandidate[]> {
    const startedAt = Date.now();
    const apiKey = this.getApiKey();

    const searches = subQueries.map((query) =>
      this.searchSingleQuery(query, apiKey, this.getRemainingBudgetMs(startedAt)),
    );

    const settled = await Promise.allSettled(searches);
    const fulfilled = settled
      .filter((result): result is PromiseFulfilledResult<TavilySourceCandidate[]> => {
        return result.status === "fulfilled";
      })
      .flatMap((result) => result.value);

    if (fulfilled.length === 0) {
      const failures = settled
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map((result) =>
          result.reason instanceof Error ? result.reason.message : "Unknown Tavily error",
        );

      throw new Error(`Tavily search failed for all sub-queries: ${failures.join("; ")}`);
    }

    return this.dedupeByUrl(fulfilled);
  }

  private async searchSingleQuery(
    query: string,
    apiKey: string,
    timeoutMs: number,
  ): Promise<TavilySourceCandidate[]> {
    const response = await fetch(`${TAVILY_BASE_URL}${TAVILY_SEARCH_PATH}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        include_raw_content: false,
        max_results: TAVILY_MAX_RESULTS,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Tavily HTTP ${response.status} for query "${query}"`);
    }

    const data = tavilySearchResponseSchema.parse(await response.json());
    this.logger.debug(`Tavily returned ${data.results.length} results for "${query}"`);

    return data.results.map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.content,
    }));
  }

  private dedupeByUrl(candidates: TavilySourceCandidate[]): TavilySourceCandidate[] {
    const unique = new Map<string, TavilySourceCandidate>();

    for (const candidate of candidates) {
      if (!unique.has(candidate.url)) {
        unique.set(candidate.url, candidate);
      }
    }

    return [...unique.values()];
  }

  private getApiKey(): string {
    const apiKey = this.configService.get<string>("TAVILY_API_KEY");

    if (!apiKey) {
      throw new Error("TAVILY_API_KEY is required for Tavily research");
    }

    return apiKey;
  }

  private getRemainingBudgetMs(startedAt: number): number {
    const elapsedMs = Date.now() - startedAt;
    const remainingBudgetMs = TAVILY_NODE_TIME_BUDGET_MS - elapsedMs;

    if (remainingBudgetMs <= 0) {
      throw new Error("Tavily research node time budget exceeded");
    }

    return remainingBudgetMs;
  }
}
