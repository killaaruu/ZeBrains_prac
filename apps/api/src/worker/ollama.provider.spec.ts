import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OllamaProvider } from "./ollama.provider";

const reportSchema = z.object({
  trend_name: z.string().min(1),
});

function openAiResponse(content: string) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      choices: [{ message: { content }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }),
  };
}

describe("OllamaProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to the next model when the primary model fails", async () => {
    const warnSpy = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("primary model timed out"))
      .mockResolvedValueOnce(
        openAiResponse(JSON.stringify({ trend_name: "AI coding assistants" })),
      );

    vi.stubGlobal("fetch", fetchMock);

    const provider = new OllamaProvider(
      new ConfigService({
        LLM_BASE_URL: "https://api.302.ai/v1",
        LLM_API_KEY: "sk-test-key",
        LLM_MODEL: "gpt-4o-mini, gpt-4o",
      }),
    );

    await expect(provider.generate("Return a report", reportSchema)).resolves.toEqual({
      trend_name: "AI coding assistants",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const bodyOf = (call: number) =>
      JSON.parse((fetchMock.mock.calls[call]?.[1] as { body: string }).body);

    const firstBody = bodyOf(0);
    expect(firstBody).toMatchObject({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Return a report" }],
      temperature: 0,
      max_tokens: 4_096,
      response_format: { type: "json_object" },
    });

    const secondBody = bodyOf(1);
    expect(secondBody).toMatchObject({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Return a report" }],
    });
    expect(warnSpy).toHaveBeenCalled();
  });

  it("uses the per-call timeout budget when provided", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(openAiResponse(JSON.stringify({ trend_name: "AI coding assistants" })));

    vi.stubGlobal("fetch", fetchMock);

    const provider = new OllamaProvider(
      new ConfigService({
        LLM_BASE_URL: "https://api.302.ai/v1",
        LLM_API_KEY: "sk-test-key",
        LLM_MODEL: "gpt-4o-mini",
      }),
    );

    await expect(
      provider.generate("Return a report", reportSchema, { timeoutMs: 4_321 }),
    ).resolves.toEqual({
      trend_name: "AI coding assistants",
    });

    expect(timeoutSpy).toHaveBeenCalledWith(4_321);
  });

  it("sends auth header when api key is set", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(openAiResponse(JSON.stringify({ trend_name: "AI coding assistants" })));

    vi.stubGlobal("fetch", fetchMock);

    const provider = new OllamaProvider(
      new ConfigService({
        LLM_BASE_URL: "https://api.302.ai/v1",
        LLM_API_KEY: "sk-secret-123",
        LLM_MODEL: "gpt-4o-mini",
      }),
    );

    await provider.generate("test", reportSchema);

    const headers = (fetchMock.mock.calls[0]?.[1] as { headers: Record<string, string> }).headers;
    expect(headers.authorization).toBe("Bearer sk-secret-123");
  });

  it("does not send auth header when api key is empty", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(openAiResponse(JSON.stringify({ trend_name: "AI coding assistants" })));

    vi.stubGlobal("fetch", fetchMock);

    const provider = new OllamaProvider(
      new ConfigService({
        LLM_BASE_URL: "https://api.302.ai/v1",
        LLM_API_KEY: "",
        LLM_MODEL: "gpt-4o-mini",
      }),
    );

    await provider.generate("test", reportSchema);

    const headers = (fetchMock.mock.calls[0]?.[1] as { headers: Record<string, string> }).headers;
    expect(headers.authorization).toBeUndefined();
  });

  it("handles API error response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        error: { message: "Incorrect API key provided", code: "invalid_api_key" },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const provider = new OllamaProvider(
      new ConfigService({
        LLM_BASE_URL: "https://api.302.ai/v1",
        LLM_API_KEY: "sk-bad-key",
        LLM_MODEL: "gpt-4o-mini",
      }),
    );

    await expect(provider.generate("test", reportSchema)).rejects.toThrow(
      "Incorrect API key provided",
    );
  });

  it("handles HTTP error status", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: vi.fn().mockResolvedValue("Rate limit exceeded"),
    });

    vi.stubGlobal("fetch", fetchMock);

    const provider = new OllamaProvider(
      new ConfigService({
        LLM_BASE_URL: "https://api.302.ai/v1",
        LLM_API_KEY: "sk-test-key",
        LLM_MODEL: "gpt-4o-mini",
      }),
    );

    await expect(provider.generate("test", reportSchema)).rejects.toThrow(
      "HTTP 429: Rate limit exceeded",
    );
  });
});
