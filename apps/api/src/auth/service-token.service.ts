import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface ServiceTokenConfig {
  module: string;
  role: string;
  tables?: string[];
}

export interface ServiceUser {
  id: string;
  module: string;
  role: string;
  tables?: string[];
  isServiceToken: true;
}

@Injectable()
export class ServiceTokenService {
  private tokenMap: Map<string, ServiceTokenConfig> = new Map();

  constructor(private configService: ConfigService) {
    this.loadTokens();
  }

  private loadTokens(): void {
    const tokensJson = this.configService.get<string>("SERVICE_TOKENS");
    if (!tokensJson) return;

    try {
      const tokens = JSON.parse(tokensJson) as Record<string, ServiceTokenConfig>;
      for (const [token, config] of Object.entries(tokens)) {
        this.tokenMap.set(token, config);
      }
    } catch {
      // Invalid JSON — no service tokens configured
    }
  }

  resolve(token: string): ServiceUser | null {
    const config = this.tokenMap.get(token);
    if (!config) return null;

    return {
      id: `service:${config.module}`,
      module: config.module,
      role: config.role,
      tables: config.tables,
      isServiceToken: true,
    };
  }
}
