import { format } from 'date-fns';
import { Calendar, Clock, ExternalLink, MapPin, Users } from 'lucide-react';

import { cn } from '@/utils/cn';

import { registerToolRenderer, type ToolResultProps } from './registry';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  startTime: string | null;
  endTime: string | null;
  location?: string;
  attendees: Array<{ email: string; name?: string; responseStatus?: string }>;
  status: string;
  htmlLink?: string;
}

function formatTime(dateString: string): string {
  try {
    return format(new Date(dateString), 'h:mm a');
  } catch {
    return dateString;
  }
}

function formatHeaderDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'EEEE, MMM d, yyyy');
  } catch {
    return dateString;
  }
}

function isAllDay(startTime: string | null): boolean {
  if (!startTime) return true;
  // All-day events from Google Calendar are date-only strings (no "T")
  return !startTime.includes('T');
}

const responseStatusLabels: Record<string, string> = {
  accepted: 'Accepted',
  declined: 'Declined',
  tentative: 'Maybe',
  needsAction: 'Pending',
};

function EventRow({ event }: { event: CalendarEvent }) {
  const allDay = isAllDay(event.startTime);
  const isCancelled = event.status === 'cancelled';

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="shrink-0 w-20 pt-0.5">
        {allDay ? (
          <span className="text-xs font-medium text-muted-foreground">All day</span>
        ) : (
          <div className="flex flex-col">
            <span className="text-xs font-medium">{formatTime(event.startTime!)}</span>
            {event.endTime && (
              <span className="text-xs text-muted-foreground">{formatTime(event.endTime)}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-sm font-medium truncate',
              isCancelled && 'line-through text-muted-foreground',
            )}
          >
            {event.summary}
          </span>

          {event.htmlLink && (
            <a
              href={event.htmlLink}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {event.location && (
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{event.location}</span>
          </p>
        )}

        {event.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{event.description}</p>
        )}

        {event.attendees.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            <Users className="w-3 h-3 text-muted-foreground shrink-0" />
            {event.attendees.slice(0, 5).map((attendee, i) => (
              <span
                key={i}
                className={cn(
                  'text-xs bg-secondary rounded-full px-2 py-0.5',
                  attendee.responseStatus === 'declined' && 'line-through text-muted-foreground',
                )}
                title={`${attendee.email} — ${responseStatusLabels[attendee.responseStatus ?? ''] ?? attendee.responseStatus}`}
              >
                {attendee.name || attendee.email.split('@')[0]}
              </span>
            ))}
            {event.attendees.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{event.attendees.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CalendarEventList({ result }: ToolResultProps) {
  const events: CalendarEvent[] = Array.isArray(result?.events) ? result.events : [];
  const count = result?.eventsCount ?? events.length;
  const date = result?.date;

  return (
    <div className="bg-card border rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-medium text-sm text-card-foreground">
          {date ? formatHeaderDate(date) : 'Calendar Events'} ({count})
        </h3>
      </div>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No events found</p>
      ) : (
        <div className="divide-y divide-border">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}

registerToolRenderer('getCalendarEventsTool', CalendarEventList);
