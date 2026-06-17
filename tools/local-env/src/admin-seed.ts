type SeedConfig = {
  databaseUrl: string;
  supabaseUrl: string;
  serviceRoleKey: string;
  email: string;
  password: string;
  localDevAuthEnabled: boolean;
  localDevAdminAuthUid: string;
};

type SeedDeps = {
  fetcher?: typeof fetch;
  query?: (databaseUrl: string, sqlText: string, values: readonly string[]) => Promise<void>;
  logger?: Pick<Console, "log" | "warn">;
};

type SupabaseUserResponse = {
  id?: string;
  users?: Array<{ id?: string; email?: string }>;
  error?: string;
  msg?: string;
  message?: string;
};

const PLACEHOLDER_SUPABASE_URL = "https://local-dev-placeholder.supabase.co";

export async function seedLocalAdminUser(config: SeedConfig, deps: SeedDeps = {}): Promise<void> {
  const logger = deps.logger ?? console;
  const query = deps.query ?? runPostgresQuery;

  if (
    config.localDevAuthEnabled &&
    (!config.serviceRoleKey || config.supabaseUrl === PLACEHOLDER_SUPABASE_URL)
  ) {
    await upsertLocalAdminProfile(
      query,
      config.databaseUrl,
      config.localDevAdminAuthUid,
      config.email,
    );
    logger.log(`Local admin ready: ${config.email}`);
    return;
  }

  if (
    !config.serviceRoleKey ||
    !config.supabaseUrl ||
    config.supabaseUrl === PLACEHOLDER_SUPABASE_URL
  ) {
    logger.log("Local admin seed skipped: Supabase admin credentials are not configured.");
    return;
  }

  const fetcher = deps.fetcher ?? fetch;
  const authUserId = await createOrFindSupabaseUser(config, fetcher);

  await upsertLocalAdminProfile(query, config.databaseUrl, authUserId, config.email);

  logger.log(`Local admin ready: ${config.email}`);
}

async function upsertLocalAdminProfile(
  query: NonNullable<SeedDeps["query"]>,
  databaseUrl: string,
  authUid: string,
  email: string,
): Promise<void> {
  await query(
    databaseUrl,
    `
      insert into profiles (auth_uid, email, first_name, last_name, role, status, updated_at)
      values ($1::uuid, $2, 'Local', 'Admin', 'admin', 'active', now())
      on conflict (auth_uid) do update set
        email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        role = 'admin',
        status = 'active',
        updated_at = now()
    `,
    [authUid, email],
  );
}

async function createOrFindSupabaseUser(
  config: SeedConfig,
  fetcher: typeof fetch,
): Promise<string> {
  const createResponse = await fetcher(`${config.supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: buildAdminHeaders(config.serviceRoleKey),
    body: JSON.stringify({
      email: config.email,
      password: config.password,
      email_confirm: true,
      app_metadata: { role: "admin", local_dev: true },
      user_metadata: { first_name: "Local", last_name: "Admin" },
    }),
  });

  const created = (await createResponse.json().catch(() => ({}))) as SupabaseUserResponse;
  if (createResponse.ok && created.id) return created.id;

  const errorMessage = created.message ?? created.msg ?? created.error ?? "";
  if (!/already|registered|exists/i.test(errorMessage)) {
    throw new Error(`Supabase admin user seed failed: ${errorMessage || createResponse.status}`);
  }

  const existing = await fetcher(`${config.supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
    method: "GET",
    headers: buildAdminHeaders(config.serviceRoleKey),
  });
  const list = (await existing.json().catch(() => ({}))) as SupabaseUserResponse;
  const user = list.users?.find((candidate) => candidate.email === config.email);
  if (!existing.ok || !user?.id) {
    throw new Error(`Supabase admin user exists but could not be resolved: ${config.email}`);
  }

  return user.id;
}

function buildAdminHeaders(serviceRoleKey: string): Record<string, string> {
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
  };
}

async function runPostgresQuery(
  databaseUrl: string,
  sqlText: string,
  values: readonly string[],
): Promise<void> {
  const postgres = (await import("postgres")).default;
  const sql = postgres(databaseUrl, { max: 1 });
  try {
    await sql.unsafe(sqlText, [...values]);
  } finally {
    await sql.end();
  }
}
