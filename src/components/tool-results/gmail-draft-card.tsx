import { CheckCircle, Send } from 'lucide-react';

import { registerToolRenderer, type ToolResultProps } from './registry';

export function GmailDraftCard({ result }: ToolResultProps) {
  if (!result?.draftId) return null;

  return (
    <div className="bg-card border rounded-lg p-4 mb-3">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <h3 className="font-medium text-sm text-card-foreground">Draft Created</h3>
      </div>

      <div className="flex items-start gap-3">
        <Send className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />

        <div className="flex-1 min-w-0">
          {result.subject && (
            <p className="text-sm font-medium truncate">{result.subject}</p>
          )}

          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
            {result.to?.length > 0 && (
              <p>To: {result.to.join(', ')}</p>
            )}
            {result.cc?.length > 0 && (
              <p>Cc: {result.cc.join(', ')}</p>
            )}
            {result.bcc?.length > 0 && (
              <p>Bcc: {result.bcc.join(', ')}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

registerToolRenderer('gmailDraftTool', GmailDraftCard);
