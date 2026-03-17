import { tool } from 'ai';
import { endOfDay, formatISO, startOfDay } from 'date-fns';
import { GaxiosError } from 'gaxios';
import { google } from 'googleapis';
import { z } from 'zod';
import { TokenVaultInterrupt } from '@auth0/ai/interrupts';

import { createGetAccessToken, withCalendar } from '../auth0-ai';

const getAccessToken = createGetAccessToken('google-oauth2', ['https://www.googleapis.com/auth/calendar.events']);

export const getCalendarEventsTool = withCalendar(
  tool({
    description: `Get calendar events for a given date from the user's Google Calendar`,
    inputSchema: z.object({
      date: z.string().describe('ISO 8601 date string, e.g. "2024-12-31"'),
    }),
    execute: async ({ date }) => {
      const dateObj = new Date(date);
      // Get the access token from Auth0 AI
      const accessToken = await getAccessToken();

      // Google SDK
      try {
        const calendar = google.calendar('v3');
        const auth = new google.auth.OAuth2();

        auth.setCredentials({
          access_token: accessToken,
        });

        // Get events for the entire day
        const response = await calendar.events.list({
          auth,
          calendarId: 'primary',
          timeMin: formatISO(startOfDay(dateObj)),
          timeMax: formatISO(endOfDay(dateObj)),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 50,
        });

        const events = response.data.items || [];

        return {
          date: formatISO(dateObj, { representation: 'date' }),
          eventsCount: events.length,
          events: events.map((event) => ({
            id: event.id,
            summary: event.summary || 'No title',
            description: event.description,
            startTime: event.start?.dateTime || event.start?.date,
            endTime: event.end?.dateTime || event.end?.date,
            location: event.location,
            attendees:
              event.attendees?.map((attendee) => ({
                email: attendee.email,
                name: attendee.displayName,
                responseStatus: attendee.responseStatus,
              })) || [],
            status: event.status,
            htmlLink: event.htmlLink,
          })),
        };
      } catch (error) {
        if (error instanceof GaxiosError) {
          if (error.status === 401) {
            throw new TokenVaultInterrupt(`Authorization required to access the Token Vault connection.`, {
              connection: 'google-oauth2',
              scopes: ['https://www.googleapis.com/auth/calendar.events'],
              requiredScopes: ['https://www.googleapis.com/auth/calendar.events'],
            });
          }
        }

        throw error;
      }
    },
  }),
);
