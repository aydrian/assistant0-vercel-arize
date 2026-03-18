import { tool } from 'ai';
import { GaxiosError } from 'gaxios';
import { google } from 'googleapis';
import { z } from 'zod';
import { TokenVaultInterrupt } from '@auth0/ai/interrupts';

import { createGetAccessToken, withGmailRead, withGmailWrite } from '../auth0-ai';

const getReadAccessToken = createGetAccessToken('google-oauth2', [
  'https://www.googleapis.com/auth/gmail.readonly',
]);
const getWriteAccessToken = createGetAccessToken('google-oauth2', [
  'https://www.googleapis.com/auth/gmail.compose',
]);

function decodeBase64Url(data: string): string {
  try {
    return Buffer.from(data, 'base64url').toString('utf-8');
  } catch {
    return data;
  }
}

function parseHeaderAndBody(payload: any): { subject?: string; sender?: string; body: string } {
  const headers: Array<{ name: string; value: string }> = payload?.headers || [];
  const subject = headers.find((h) => h.name === 'Subject')?.value;
  const sender = headers.find((h) => h.name === 'From')?.value;

  let body = '';
  if (payload?.parts) {
    body = payload.parts
      .filter((part: any) => part.mimeType === 'text/plain')
      .map((part: any) => decodeBase64Url(part.body?.data ?? ''))
      .join('');
  } else if (payload?.body?.data) {
    body = decodeBase64Url(payload.body.data);
  }

  return { subject, sender, body };
}

export const gmailSearchTool = withGmailRead(
  tool({
    description:
      'A tool for searching Gmail messages or threads. Use this to find emails matching a query.',
    inputSchema: z.object({
      query: z.string().describe('Gmail search query (e.g. "from:alice subject:report")'),
      maxResults: z.number().optional().describe('Maximum number of results to return. Default is 10.'),
    }),
    execute: async ({ query, maxResults = 10 }) => {
      const accessToken = await getReadAccessToken();

      try {
        const gmail = google.gmail('v1');
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });

        const { data } = await gmail.users.messages.list({
          auth,
          userId: 'me',
          q: query,
          maxResults,
        });

        const messageRefs = data.messages || [];
        if (messageRefs.length === 0) {
          return { query, messagesCount: 0, messages: [] };
        }

        const messages = await Promise.all(
          messageRefs.map(async (ref) => {
            const { data: msg } = await gmail.users.messages.get({
              auth,
              userId: 'me',
              format: 'full',
              id: ref.id!,
            });
            const { subject, sender, body } = parseHeaderAndBody(msg.payload);
            return {
              id: ref.id!,
              threadId: ref.threadId!,
              snippet: msg.snippet || '',
              body,
              subject,
              sender,
            };
          }),
        );

        return { query, messagesCount: messages.length, messages };
      } catch (error) {
        if (error instanceof GaxiosError && error.status === 401) {
          throw new TokenVaultInterrupt('Authorization required to access the Token Vault connection.', {
            connection: 'google-oauth2',
            scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
            requiredScopes: ['https://www.googleapis.com/auth/gmail.readonly'],
          });
        }
        throw error;
      }
    },
  }),
);

export const gmailDraftTool = withGmailWrite(
  tool({
    description: 'A tool for creating draft emails in Gmail.',
    inputSchema: z.object({
      message: z.string().describe('The body of the email'),
      to: z.array(z.string()).describe('Array of recipient email addresses'),
      subject: z.string().describe('The email subject line'),
      cc: z.array(z.string()).optional().describe('Array of CC email addresses'),
      bcc: z.array(z.string()).optional().describe('Array of BCC email addresses'),
    }),
    execute: async ({ message, to, subject, cc, bcc }) => {
      const accessToken = await getWriteAccessToken();

      try {
        const gmail = google.gmail('v1');
        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: accessToken });

        const emailLines = [
          `To: ${to.join(', ')}`,
          `Subject: ${subject}`,
          cc?.length ? `Cc: ${cc.join(', ')}` : '',
          bcc?.length ? `Bcc: ${bcc.join(', ')}` : '',
          '',
          message,
        ]
          .filter(Boolean)
          .join('\n');

        const raw = Buffer.from(emailLines).toString('base64url');

        const { data } = await gmail.users.drafts.create({
          auth,
          userId: 'me',
          requestBody: { message: { raw } },
        });

        return {
          draftId: data.id!,
          to,
          subject,
          cc,
          bcc,
        };
      } catch (error) {
        if (error instanceof GaxiosError && error.status === 401) {
          throw new TokenVaultInterrupt('Authorization required to access the Token Vault connection.', {
            connection: 'google-oauth2',
            scopes: ['https://www.googleapis.com/auth/gmail.compose'],
            requiredScopes: ['https://www.googleapis.com/auth/gmail.compose'],
          });
        }
        throw error;
      }
    },
  }),
);
