import { tool } from 'ai';
import { z } from 'zod';
import { GmailCreateDraft, GmailSearch } from '@langchain/community/tools/gmail';

import { createGetAccessToken, withGmailRead, withGmailWrite } from '../auth0-ai';

// Provide connection-aware access token getters to the Gmail tools.
// These convert TokenVaultError → TokenVaultInterrupt to bypass the
// broken instanceof check in protect(). See docs/auth0-ai-instanceof-issue.md.
const gmailSearch = new GmailSearch({
  credentials: {
    accessToken: createGetAccessToken('google-oauth2', ['openid', 'https://www.googleapis.com/auth/gmail.readonly']),
  },
});

export const gmailSearchTool = withGmailRead(
  tool({
    description: gmailSearch.description,
    inputSchema: z.object({
      query: z.string(),
      maxResults: z.number().optional(),
      resource: z.enum(['messages', 'threads']).optional(),
    }),
    execute: async (args) => {
      try {
        return await gmailSearch.invoke(args);
      } catch (error) {
        if (error instanceof Error && error.message === 'No messages returned from Gmail') {
          return `No emails found matching the query: "${args.query}"`;
        }
        throw error;
      }
    },
  }),
);

const gmailDraft = new GmailCreateDraft({
  credentials: {
    accessToken: createGetAccessToken('google-oauth2', ['openid', 'https://www.googleapis.com/auth/gmail.compose']),
  },
});

export const gmailDraftTool = withGmailWrite(
  tool({
    description: gmailDraft.description,
    inputSchema: z.object({
      message: z.string(),
      to: z.array(z.string()),
      subject: z.string(),
      cc: z.array(z.string()).optional(),
      bcc: z.array(z.string()).optional(),
    }),
    execute: async (args) => {
      return await gmailDraft.invoke(args);
    },
  }),
);
