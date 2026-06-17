import { Injectable, Logger, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { decode, verify } from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

@Injectable()
export class JwksService {
  private readonly logger = new Logger(JwksService.name);
  private client: JwksClient | null = null;

  constructor(@Optional() private configService?: ConfigService) {
    const supabaseUrl = this.configService?.get<string>("SUPABASE_URL");
    this.logger.log(`Initializing JwksService, SUPABASE_URL=${supabaseUrl ? "set" : "NOT SET"}`);
    if (supabaseUrl) {
      const jwksUri = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
      this.logger.log(`JWKS URI: ${jwksUri}`);
      this.client = new JwksClient({
        jwksUri,
        cache: true,
        cacheMaxAge: 600_000,
      });
    } else {
      this.logger.warn("No SUPABASE_URL configured — JWKS verification disabled");
    }
  }

  async getSigningKey(token: string): Promise<string | null> {
    if (!this.client) {
      this.logger.warn("getSigningKey called but JWKS client is null");
      return null;
    }

    const decoded = decode(token, { complete: true });
    this.logger.debug(`Token header: alg=${decoded?.header?.alg}, kid=${decoded?.header?.kid}`);

    if (!decoded?.header?.kid) {
      this.logger.warn("Token has no kid in header, cannot resolve JWKS key");
      return null;
    }

    try {
      const key = await this.client.getSigningKey(decoded.header.kid);
      const publicKey = key.getPublicKey();
      this.logger.log(
        `JWKS key resolved for kid=${decoded.header.kid}, publicKey length=${publicKey.length}`,
      );
      return publicKey;
    } catch (error) {
      this.logger.error(`Failed to get JWKS signing key for kid=${decoded.header.kid}: ${error}`);
      return null;
    }
  }

  verifyWithPublicKey(token: string, publicKey: string): Record<string, unknown> {
    return verify(token, publicKey, { algorithms: ["ES256"] }) as Record<string, unknown>;
  }
}
