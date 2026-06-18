import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ZodType } from "zod";

const OLLAMA_GENERATE_PATH = "/api/generate";
const OLLAMA_REQUEST_TIMEOUT_MS = 120_000;

export interface OllamaGenerateOptions {
  timeoutMs?: number;
}

interface OllamaGenerateResponse {
  error?: string;
  response?: string;
}

@Injectable()
export class OllamaProvider {
  private readonly logger = new Logger(OllamaProvider.name);
  private readonly baseUrl: string;
  private readonly modelPool: string[];

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.getOrThrow<string>("OLLAMA_BASE_URL");
    this.modelPool = this.configService
      .getOrThrow<string>("LLM_MODEL_POOL")
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
        const message = error instanceof Error ? error.message : "Unknown Ollama error";
        failures.push(`${model}: ${message}`);

        if (index < this.modelPool.length - 1) {
          this.logger.warn(
            `Ollama model ${model} failed (${message}). Falling back to ${this.modelPool[index + 1]}.`,
          );
        }
      }
    }

    throw new Error(`All Ollama models failed: ${failures.join("; ")}`);
  }

  private async requestModel<T>(
    model: string,
    prompt: string,
    schema?: ZodType<T>,
    options?: OllamaGenerateOptions,
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}${OLLAMA_GENERATE_PATH}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        ...(schema ? { format: "json" } : {}),
      }),
      signal: AbortSignal.timeout(options?.timeoutMs ?? OLLAMA_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = (await response.json()) as OllamaGenerateResponse;

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.response) {
      throw new Error("Ollama response payload did not include response text");
    }

    return data.response;
  }
}
