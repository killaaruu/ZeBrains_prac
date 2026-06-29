import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ZodType } from "zod";

const LLM_CHAT_PATH = "/chat/completions";
const LLM_REQUEST_TIMEOUT_MS = 120_000;
const LLM_MAX_TOKENS = 4_096;

export interface OllamaGenerateOptions {
  timeoutMs?: number;
}

interface OpenAIChoice {
  message: { content: string };
  finish_reason: string;
}

interface OpenAIResponse {
  choices?: OpenAIChoice[];
  error?: { message: string; type?: string; code?: string };
}

@Injectable()
export class OllamaProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly modelPool: string[];

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>("LLM_BASE_URL").replace(/\/+$/, "");
    this.apiKey = this.configService.get<string>("LLM_API_KEY") ?? "";
    this.modelPool = this.configService
      .getOrThrow<string>("LLM_MODEL")
      .split(",")
      .map((model) => model.trim())
      .filter((model) => model.length > 0);
  }

  async generate(prompt: string): Promise<string>;
  async generate<T>(
    prompt: string,
    schema: ZodType<T>,
    options?: OllamaGenerateOptions,
  ): Promise<T>;
  async generate<T>(
    prompt: string,
    schema?: ZodType<T>,
    options?: OllamaGenerateOptions,
  ): Promise<string | T> {
    const failures: string[] = [];

    for (const [index, model] of this.modelPool.entries()) {
      try {
        const response = await this.requestModel(model, prompt, schema, options);
        return schema ? schema.parse(JSON.parse(response)) : response;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown LLM error";
        failures.push(`${model}: ${message}`);

        if (index < this.modelPool.length - 1) {
          this.logger.warn(
            `LLM model ${model} failed (${message}). Falling back to ${this.modelPool[index + 1]}.`,
          );
        }
      }
    }

    throw new Error(`All LLM models failed: ${failures.join("; ")}`);
  }

  private async requestModel<T>(
    model: string,
    prompt: string,
    schema?: ZodType<T>,
    options?: OllamaGenerateOptions,
  ): Promise<string> {
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0,
      max_tokens: LLM_MAX_TOKENS,
    };

    if (schema) {
      body.response_format = { type: "json_object" };
    }

    const headers: Record<string, string> = {
      "content-type": "application/json",
    };

    if (this.apiKey) {
      headers.authorization = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${LLM_CHAT_PATH}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options?.timeoutMs ?? LLM_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const data = (await response.json()) as OpenAIResponse;

    if (data.error) {
      throw new Error(data.error.message ?? JSON.stringify(data.error));
    }

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("LLM response did not include message content");
    }

    return content;
  }
}
