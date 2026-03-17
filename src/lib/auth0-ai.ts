import { Auth0AI, getAccessTokenFromTokenVault } from '@auth0/ai-vercel';
import { AccessDeniedInterrupt, TokenVaultInterrupt } from '@auth0/ai/interrupts';

import { getRefreshToken, getUser } from './auth0';

// Factory: creates a getAccessToken that converts TokenVaultError → TokenVaultInterrupt.
// Bypasses the broken `instanceof TokenVaultError` check in protect() caused by
// Turbopack/webpack creating separate module instances. See docs/auth0-ai-instanceof-issue.md.
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

// Generic version (kept for backwards compat — avoid using in new tools)
export const getAccessToken = async () => getAccessTokenFromTokenVault();

const auth0AI = new Auth0AI();

// Connection for Google services
export const withGmailRead = auth0AI.withTokenVault({
  connection: 'google-oauth2',
  scopes: ['openid', 'https://www.googleapis.com/auth/gmail.readonly'],
  refreshToken: getRefreshToken,
});
export const withGmailWrite = auth0AI.withTokenVault({
  connection: 'google-oauth2',
  scopes: ['openid', 'https://www.googleapis.com/auth/gmail.compose'],
  refreshToken: getRefreshToken,
});
export const withCalendar = auth0AI.withTokenVault({
  connection: 'google-oauth2',
  scopes: ['openid', 'https://www.googleapis.com/auth/calendar.events'],
  refreshToken: getRefreshToken,
});

export const withGitHubConnection = auth0AI.withTokenVault({
  connection: 'github',
  // scopes are not supported for GitHub yet. Set required scopes when creating the accompanying GitHub app
  scopes: [],
  refreshToken: getRefreshToken,
  credentialsContext: 'tool-call',
});

export const withSlack = auth0AI.withTokenVault({
  connection: 'sign-in-with-slack',
  scopes: ['channels:read', 'groups:read'],
  refreshToken: getRefreshToken,
});
export const withTasks = auth0AI.withTokenVault({
  connection: 'google-oauth2',
  scopes: ['https://www.googleapis.com/auth/tasks'],
  refreshToken: getRefreshToken,
});

// CIBA flow for user confirmation
export const withAsyncAuthorization = auth0AI.withAsyncAuthorization({
  userID: async () => {
    const user = await getUser();
    return user?.sub as string;
  },
  bindingMessage: async ({ product, qty }) => `Do you want to buy ${qty} ${product}`,
  scopes: ['openid', 'product:buy'],
  audience: process.env['SHOP_API_AUDIENCE']!,

  /**
   * Controls how long the authorization request is valid.
   */
  // requestedExpiry: 301,

  /**
   * The behavior when the authorization request is made.
   *
   * - `block`: The tool execution is blocked until the user completes the authorization.
   * - `interrupt`: The tool execution is interrupted until the user completes the authorization.
   * - a callback: Same as "block" but give access to the auth request and executing logic.
   *
   * Defaults to `interrupt`.
   *
   * When this flag is set to `block`, the execution of the tool awaits
   * until the user approves or rejects the request.
   * Given the asynchronous nature of the CIBA flow, this mode
   * is only useful during development.
   *
   * In practice, the process that is awaiting the user confirmation
   * could crash or timeout before the user approves the request.
   */
  onAuthorizationRequest: async (_authReq, creds) => {
    await creds;
  },

  onUnauthorized: async (e: Error) => {
    if (e instanceof AccessDeniedInterrupt) {
      return 'The user has denied the request';
    }
    return e.message;
  },
});
