import { cache } from 'react';
import { Auth0Client } from '@auth0/nextjs-auth0/server';

export const auth0 = new Auth0Client({
  enableConnectAccountEndpoint: true,
});

// Deduplicate getSession() calls within a single request using React.cache()
export const getSession = cache(() => auth0.getSession());

// Get the refresh token from Auth0 session
export const getRefreshToken = async () => {
  const session = await getSession();
  return session?.tokenSet?.refreshToken;
};

export const getUser = async () => {
  const session = await getSession();
  return session?.user;
};
