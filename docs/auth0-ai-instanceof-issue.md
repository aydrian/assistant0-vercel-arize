# Auth0 AI — Bundler `instanceof` Issue

## Problem

`@auth0/ai` (v6) and `@auth0/ai-vercel` (v5) rely on `instanceof` checks internally to detect interrupt types. When bundled by Turbopack or webpack (as in Next.js 16), the bundler can create separate module instances for the same class, causing `instanceof` to return `false` even when the object is the correct type.

This breaks the Token Vault authorization flow in two ways:

1. **"No credentials" path (first authorization)**: `getAccessTokenFromTokenVault()` (inside `@auth0/ai/asyncLocalStorage.js`) throws `TokenVaultError("No credentials found")`. The library's `protect()` wrapper tries `err instanceof TokenVaultError` → fails → error escapes as a plain `Error` that no name-based check can detect.

2. **401 path (expired tokens)**: Tools that throw `TokenVaultError` on API 401 responses expecting `protect()` to convert it to `TokenVaultInterrupt` — same `instanceof` failure, same result.

## Affected `instanceof` Checks in the Libraries

### `@auth0/ai`

| File | Line | Check | Impact |
|---|---|---|---|
| `TokenVaultAuthorizerBase.js` | 199 | `err instanceof TokenVaultError` | Tool's `TokenVaultError` not caught → no conversion to `TokenVaultInterrupt` → no interrupt popup |
| `TokenVaultAuthorizerBase.js` | 209 | `err instanceof Auth0Interrupt` | Auth0 interrupts not caught for credential cleanup |
| `AsyncAuthorizerBase.js` | 118-119 | `err instanceof AuthorizationPendingInterrupt` / `AuthorizationPollingInterrupt` | CIBA polling may not work correctly |
| `DeviceAuthorizerBase.js` | 122-123 | Same as above | Device auth flow polling may not work correctly |

### `@auth0/ai-vercel`

| File | Line | Check | Impact |
|---|---|---|---|
| `errorSerializer.js` | 14 | `error.cause instanceof Auth0Interrupt` | Interrupts not serialized with `AUTH0_AI_INTERRUPTION:` prefix → client can't detect them |

## Why `serverExternalPackages` Doesn't Work

Adding `@auth0/ai` or `@auth0/ai-vercel` to Next.js `serverExternalPackages` causes:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../node_modules/@auth0/ai/dist/esm/interrupts/Auth0Interrupt'
imported from '.../node_modules/@auth0/ai/dist/esm/interrupts/index.js'
```

The ESM build (`dist/esm/`) uses extensionless imports (e.g., `import { Auth0Interrupt } from "./Auth0Interrupt"` instead of `"./Auth0Interrupt.js"`). Node.js native ESM resolution requires explicit `.js` extensions when loading modules outside a bundler.

## Our Workarounds

### 1. `createGetAccessToken` factory (bypass `instanceof TokenVaultError` on "no credentials" path)

`getAccessTokenFromTokenVault()` throws `TokenVaultError("No credentials found")` which `protect()` can't catch. We wrap it in a factory (`src/lib/auth0-ai.ts`) that converts any error to a `TokenVaultInterrupt` with the correct connection/scopes:

```ts
export function createGetAccessToken(connection: string, scopes: string[]) {
  return async () => {
    try {
      return getAccessTokenFromTokenVault();
    } catch {
      throw new TokenVaultInterrupt(
        `Authorization required to access the Token Vault: ${connection}.`,
        { connection, scopes, requiredScopes: scopes },
      );
    }
  };
}
```

Each tool creates a connection-specific accessor: `const getAccessToken = createGetAccessToken('google-oauth2', [...])`.

### 2. Tools throw `TokenVaultInterrupt` on 401 (bypass `instanceof TokenVaultError` on expired token path)

Instead of `throw new TokenVaultError(...)`, tools throw `throw new TokenVaultInterrupt(...)` with connection/scopes. This bypasses the broken `instanceof TokenVaultError` check in `protect()`. Even if the downstream `instanceof Auth0Interrupt` check also fails (line 209), the error falls through to `throw err`, and the thrown `TokenVaultInterrupt` has `name === "AUTH0_AI_INTERRUPT"` which our name-based checks detect.

### 3. Custom `authErrorSerializer` (bypass `instanceof Auth0Interrupt` in `errorSerializer`)

Instead of importing `errorSerializer` from `@auth0/ai-vercel/interrupts`, we define our own in `route.ts` that uses `Auth0Interrupt.isInterrupt()` (checks `error.name === "AUTH0_AI_INTERRUPT"`) instead of `instanceof`.

### 4. `onFinish` scans all steps (bypass AI SDK stop condition limitation)

The AI SDK's `stopWhen` conditions are **only evaluated for client-side tool calls** (`stream-text.ts` lines 2077-2089: `isStopConditionMet` is gated by `clientToolCalls.length > 0`). Server-side tools (all our tools) never trigger stop condition checks, so the LLM always gets a second turn after a tool error.

Instead of relying on `stopWhen`, the `onFinish` callback scans ALL steps (via `output.steps`) for auth interrupts using `Auth0Interrupt.isInterrupt()`. When found, it throws a serializable error that reaches `authErrorSerializer`.

## Suggested Library Fixes

If the library authors address this:

1. **Add `.js` extensions to all ESM imports** in `dist/esm/` — this enables `serverExternalPackages` as the primary fix, ensuring a single module instance
2. **Replace `instanceof` checks with `isInterrupt()` calls** in `protect()`, `errorSerializer`, and authorizer base classes — the `isInterrupt()` static method already exists and uses name-based checking (`error.name === "AUTH0_AI_INTERRUPT"`)
3. **Export `InterruptionPrefix`** and document the error serialization format so consumers can build custom serializers without reimplementing the logic

## Library Versions

- `@auth0/ai`: 6.0.0
- `@auth0/ai-vercel`: 5.1.0
- Next.js: 16.x (Turbopack default bundler)
