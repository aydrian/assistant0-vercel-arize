export function ThinkingIndicator({ aiEmoji }: { aiEmoji?: string }) {
  return (
    <div className="rounded-3xl max-w-[80%] mb-8 flex mr-auto">
      <div className="mr-4 -mt-2 border bg-secondary rounded-full w-10 h-10 shrink-0 flex items-center justify-center">
        {aiEmoji}
      </div>
      <div className="flex items-center gap-1 pt-1">
        <span className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:0ms]" />
        <span className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:150ms]" />
        <span className="w-2 h-2 rounded-full bg-foreground/50 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}
