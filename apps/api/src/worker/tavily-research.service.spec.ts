import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TAVILY_NODE_TIME_BUDGET_MS, TavilyResearchService } from "./tavily-research.service";

function createConfigService(apiKey: string | undefined = "tvly-dev-example") {
  return {
    get: vi.fn((key: string) => (key === "TAVILY_API_KEY" ? apiKey : undefined)),
  } as unknown as ConfigService;
}

function createResponse(results: Array<Record<string, string>>) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({ results }),
  } satisfies Partial<Response>;
}

describe("TavilyResearchService", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fans out sub-queries in parallel, dedupes URLs, and maps source candidates", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createResponse([
          {
            title: "GitHub Copilot momentum",
            url: "https://example.com/copilot",
            content: "Copilot adoption continues to grow.",
          },
          {
            title: "Duplicate URL",
            url: "https://example.com/copilot",
            content: "Duplicate should be dropped.",
          },
        ]),
      )
      .mockResolvedValueOnce(
        createResponse([
          {
            title: "Yandex Code Assistant",
            url: "https://example.com/yandex",
            content: "A Russia market example.",
          },
        ]),
      );
    vi.stubGlobal("fetch", fetchMock);

    const service = new TavilyResearchService(createConfigService());

    await expect(
      service.search(["AI coding assistants market", "AI coding assistants Russia"]),
    ).resolves.toEqual([
      {
        title: "GitHub Copilot momentum",
        url: "https://example.com/copilot",
        snippet: "Copilot adoption continues to grow.",
      },
      {
        title: "Yandex Code Assistant",
        url: "https://example.com/yandex",
        snippet: "A Russia market example.",
      },
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("/search"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer tvly-dev-example",
          "content-type": "application/json",
        }),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining("AI coding assistants Russia"),
      }),
    );
  });

  it("throws when the Tavily API key is missing", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const service = new TavilyResearchService(createConfigService(""));

    await expect(service.search(["AI coding assistants market"])).rejects.toThrow("TAVILY_API_KEY");
  });

  it("stops dispatching searches once the node time budget is exhausted", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createResponse([
        {
          title: "GitHub Copilot momentum",
          url: "https://example.com/copilot",
          content: "Copilot adoption continues to grow.",
        },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(10_000)
      .mockReturnValueOnce(10_000)
      .mockReturnValueOnce(10_000 + TAVILY_NODE_TIME_BUDGET_MS + 1);

    const service = new TavilyResearchService(createConfigService());

    await expect(
      service.search(["AI coding assistants market", "AI coding assistants Russia"]),
    ).rejects.toThrow("time budget");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
