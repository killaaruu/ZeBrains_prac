# packages/services-client — Client-side Supabase abstractions

The **interface boundary** between client features and Supabase. Per the root rule: on the client, Supabase SDK is used for Auth, Realtime, and Storage — but feature code must depend on the **interfaces here**, never on `@supabase/supabase-js` directly. This keeps features testable and swap-able.

## Exports (interface + implementation, no DI container)

Each concern is a `*.interface.ts` (the contract) plus a concrete implementation. Consumers instantiate the implementation directly — there is no factory or DI registry.

- `IAuthService` → `SupabaseAuthService` — `signUp/signIn/signInWithOAuth/signOut/resetPassword/getSession/getUser/onAuthStateChange`
- `IRealtimeService` → Supabase table subscriptions — `subscribeToTable/subscribeToFiltered/subscribeToRow/unsubscribeAll`
- `IStorageService` → `SupabaseStorageService` — `upload/getPublicUrl/getSignedUrl/delete/list`
- `IPresaleApiService` → `FetchPresaleApiService` — typed REST client for the presale backend (`executeLifecycleCommand/list/get/versionHistory`). This one talks to the NestJS API, not Supabase.

Subpath exports: `./auth`, `./realtime`, `./storage`, `./presale`.

## Conventions

- `@supabase/supabase-js` is a **peer dependency** — the consuming app provides the client instance; this package never creates its own.
- When adding a Supabase capability used by a feature, add the interface here first, then the implementation. Don't let features reach for the raw SDK.
- Consumed by `@repo/client-core` and `apps/web`.

## TDD (Mandatory)

Red → Green → Refactor — see root `CLAUDE.md`. One test file per service; tests live next to the code.
