import { ErrorCode, WebClient } from '@slack/web-api';
import { TokenVaultInterrupt } from '@auth0/ai/interrupts';
import { createGetAccessToken, withSlack } from '@/lib/auth0-ai';

const getAccessToken = createGetAccessToken('sign-in-with-slack', ['channels:read', 'groups:read']);
import { tool } from 'ai';
import { z } from 'zod';

export const listSlackChannels = withSlack(
  tool({
    description: 'List channels for the current user on Slack',
    inputSchema: z.object({}),
    execute: async () => {
      // Get the access token from Auth0 AI
      const accessToken = await getAccessToken();

      // Slack SDK
      try {
        const web = new WebClient(accessToken);

        const result = await web.conversations.list({
          exclude_archived: true,
          types: 'public_channel,private_channel',
          limit: 10,
        });

        const channelNames = result.channels?.map((channel) => channel.name) || [];

        return {
          total_channels: channelNames.length,
          channels: channelNames,
        };
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error) {
          if (error.code === ErrorCode.HTTPError) {
            throw new TokenVaultInterrupt(`Authorization required to access the Federated Connection`, {
              connection: 'sign-in-with-slack',
              scopes: ['channels:read', 'groups:read'],
              requiredScopes: ['channels:read', 'groups:read'],
            });
          }
        }

        throw error;
      }
    },
  }),
);
