import { Mail } from 'lucide-react';

import { cn } from '@/utils/cn';

import { registerToolRenderer, type ToolResultProps } from './registry';

interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  body: string;
  subject?: string;
  sender?: string;
}

function MessageRow({ message }: { message: GmailMessage }) {
  return (
    <div className="py-3">
      <div className="flex items-center gap-2">
        {message.sender && (
          <span className="text-sm font-medium truncate">{message.sender}</span>
        )}
      </div>

      {message.subject && (
        <p className="text-sm truncate mt-0.5">{message.subject}</p>
      )}

      {message.snippet && (
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{message.snippet}</p>
      )}
    </div>
  );
}

export function GmailMessageList({ result }: ToolResultProps) {
  const messages: GmailMessage[] = Array.isArray(result?.messages) ? result.messages : [];
  const count = result?.messagesCount ?? messages.length;
  const query = result?.query;

  return (
    <div className="bg-card border rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-medium text-sm text-card-foreground">Emails ({count})</h3>
      </div>

      {query && (
        <p className="text-xs text-muted-foreground mb-2">
          Search: &ldquo;{query}&rdquo;
        </p>
      )}

      {messages.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">No emails found</p>
      ) : (
        <div className="divide-y divide-border">
          {messages.map((message) => (
            <MessageRow key={message.id} message={message} />
          ))}
        </div>
      )}
    </div>
  );
}

registerToolRenderer('gmailSearchTool', GmailMessageList);
