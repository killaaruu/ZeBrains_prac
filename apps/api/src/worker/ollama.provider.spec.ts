import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OllamaProvider } from "./ollama.provider";

const reportSchema = z.object({
  trend_name: z.string().min(1),
});

describe("OllamaProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back to the next model when the primary model fails", async () => {
    const warnSpy = vi.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("primary model timed out"))
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          response: JSON.stringify({ trend_name: "AI coding assistants" }),
        }),
      });

    vi.stubGlobal("fetch", fetchMock);

    const provider = new OllamaProvider(
      new ConfigService({
        OLLAMA_BASE_URL: "http://ollama.local:11434",
        LLM_MODEL_POOL: "qwen2.5:7b, gemma4:12b-it-qat",
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
      model: "qwen2.5:7b",
      prompt: "Return a report",
      stream: false,
      options: { temperature: 0, num_predict: 4_096 },
    });
    // Structured outputs: `format` carries the JSON schema, not the string "json".
    expect(firstBody.format).toMatchObject({ type: "object" });

    const secondBody = bodyOf(1);
    expect(secondBody).toMatchObject({ model: "gemma4:12b-it-qat", prompt: "Return a report" });
    expect(secondBody.format).toMatchObject({ type: "object" });
    expect(warnSpy).toHaveBeenCalled();
  });

  it("uses the per-call timeout budget when provided", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        response: JSON.stringify({ trend_name: "AI coding assistants" }),
      }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const provider = new OllamaProvider(
      new ConfigService({
        OLLAMA_BASE_URL: "http://ollama.local:11434",
        LLM_MODEL_POOL: "qwen2.5:7b",
      }),
    );

    await expect(
      provider.generate("Return a report", reportSchema, { timeoutMs: 4_321 }),
    ).resolves.toEqual({
      trend_name: "AI coding assistants",
    });

    expect(timeoutSpy).toHaveBeenCalledWith(4_321);
  });
});
