import { Global, Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_ADMIN_CLIENT = Symbol("SUPABASE_ADMIN_CLIENT");

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_ADMIN_CLIENT,
      useFactory: (config: ConfigService): SupabaseClient => {
        const logger = new Logger("SupabaseAdminClient");
        const url = config.get<string>("SUPABASE_URL");
        const secretKey = config.get<string>("SUPABASE_SECRET_KEY");
        if (!url || !secretKey) {
          logger.warn(
            "SUPABASE_URL or SUPABASE_SECRET_KEY missing — Supabase admin client unavailable",
          );
          return createClient("http://disabled.local", "disabled", {
            auth: { persistSession: false, autoRefreshToken: false },
          });
        }
        return createClient(url, secretKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [SUPABASE_ADMIN_CLIENT],
})
export class SupabaseModule {}
