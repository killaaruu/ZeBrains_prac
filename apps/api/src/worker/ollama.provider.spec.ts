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
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://ollama.local:11434/api/generate",
      expect.objectContaining({
        body: JSON.stringify({
          model: "qwen2.5:7b",
          prompt: "Return a report",
          stream: false,
          format: "json",
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://ollama.local:11434/api/generate",
      expect.objectContaining({
        body: JSON.stringify({
          model: "gemma4:12b-it-qat",
          prompt: "Return a report",
          stream: false,
          format: "json",
        }),
      }),
    );
    expect(warnSpy).toHaveBeenCalled();
  });
});
