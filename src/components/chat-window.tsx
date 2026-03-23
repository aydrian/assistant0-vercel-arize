'use client';

import { useState, useMemo, type FormEvent, type ReactNode } from 'react';
import { type UIMessage, DefaultChatTransport, generateId, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useChat } from '@ai-sdk/react';
import { toast } from 'sonner';
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';
import { ArrowDown, ArrowUpIcon, LoaderCircle } from 'lucide-react';
import { useInterruptions } from '@auth0/ai-vercel/react';

import { TokenVaultInterruptHandler } from '@/components/TokenVaultInterruptHandler';
import { ChatMessageBubble } from '@/components/chat-message-bubble';
import { ThinkingIndicator } from '@/components/thinking-indicator';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

function ChatMessages(props: {
  messages: UIMessage[];
  emptyStateComponent: ReactNode;
  aiEmoji?: string;
  className?: string;
  interruptedToolCallId?: string;
}) {
  // Hide the "Product Found" search card once the order is confirmed
  const hasConfirmedOrder = props.messages.some(m =>
    (m as any).parts?.some((p: any) =>
      p.type === 'tool-shopOnlineTool' &&
      (p.state === 'output-available' || p.output !== undefined)
    )
  );

  return (
    <div className="flex flex-col max-w-3xl mx-auto pb-12 w-full">
      {props.messages.map((m) => (
        <ChatMessageBubble key={m.id} message={m} aiEmoji={props.aiEmoji} hideSearchCard={hasConfirmedOrder} interruptedToolCallId={props.interruptedToolCallId} />
      ))}
    </div>
  );
}

function ScrollToBottom(props: { className?: string }) {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  if (isAtBottom) return null;
  return (
    <Button variant="outline" className={props.className} onClick={() => scrollToBottom()}>
      <ArrowDown className="w-4 h-4" />
      <span>Scroll to bottom</span>
    </Button>
  );
}

function ChatInput(props: {
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  loading?: boolean;
  placeholder?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.stopPropagation();
        e.preventDefault();
        props.onSubmit(e);
      }}
      className={cn('flex w-full flex-col', props.className)}
    >
      <div className="border border-input bg-background rounded-lg flex flex-col gap-2 max-w-3xl w-full mx-auto">
        <input
          value={props.value}
          placeholder={props.placeholder}
          onChange={props.onChange}
          className="border-none outline-none bg-transparent p-4"
        />

        <div className="flex justify-between ml-4 mr-2 mb-2">
          <div className="flex gap-3">{props.children}</div>

          <Button
            className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
            type="submit"
            disabled={props.loading}
          >
            {props.loading ? <LoaderCircle className="animate-spin" /> : <ArrowUpIcon size={14} />}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function ChatWindow(props: {
  endpoint: string;
  emptyStateComponent: ReactNode;
  placeholder?: string;
  emoji?: string;
}) {
  const transport = useMemo(() => new DefaultChatTransport({ api: props.endpoint }), [props.endpoint]);

  const { messages, sendMessage, status, toolInterrupt } = useInterruptions((handler) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useChat({
      transport,
      generateId,
      onError: handler((e: Error) => {
        console.error('Error: ', e);
        toast.error(`Error while processing your request`, { description: e.message });
      }),
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    }),
  );

  const [input, setInput] = useState('');

  const isChatLoading = status === 'submitted' || status === 'streaming';

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;
    await sendMessage({ text: input });
    setInput('');
  }

  return (
    <StickToBottom className="absolute inset-0">
      <StickToBottom.Content className="py-8 px-2">
        {messages.length === 0 ? (
          <div>{props.emptyStateComponent}</div>
        ) : (
          <>
            <ChatMessages
              aiEmoji={props.emoji}
              interruptedToolCallId={(toolInterrupt as any)?.toolCall?.id}
              messages={
                toolInterrupt
                  ? messages.map((m, i) => {
                      if (m.role === 'assistant' && i === messages.length - 1) {
                        return { ...m, parts: m.parts?.filter((p: any) => p.type?.startsWith('tool-')) };
                      }
                      return m;
                    })
                  : messages
              }
              emptyStateComponent={props.emptyStateComponent}
            />
            {(() => {
              const lastMsg = messages[messages.length - 1];
              const assistantHasContent =
                lastMsg?.role === 'assistant' &&
                lastMsg.parts?.some(
                  (p: any) =>
                    (p.type === 'text' && p.text?.trim()) || p.type?.startsWith('tool-'),
                );
              return (
                isChatLoading &&
                messages.length > 0 &&
                !assistantHasContent && (
                  <div className="flex flex-col max-w-3xl mx-auto w-full">
                    <ThinkingIndicator aiEmoji={props.emoji} />
                  </div>
                )
              );
            })()}
            <div className="flex flex-col max-w-3xl mx-auto pb-12 w-full">
              <TokenVaultInterruptHandler interrupt={toolInterrupt} />
            </div>
          </>
        )}
      </StickToBottom.Content>

      <div className="sticky bottom-8 px-2">
        <ScrollToBottom className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4" />
        <ChatInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSubmit={onSubmit}
          loading={isChatLoading}
          placeholder={props.placeholder ?? 'What can I help you with?'}
        ></ChatInput>
      </div>
    </StickToBottom>
  );
}
