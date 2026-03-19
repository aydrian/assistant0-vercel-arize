import { NextRequest } from 'next/server';
import {
  streamText,
  stepCountIs,
  type UIMessage,
  createUIMessageStream,
  createUIMessageStreamResponse,
  convertToModelMessages,
} from 'ai';
import { openai } from '@ai-sdk/openai';
import { setAIContext } from '@auth0/ai-vercel';
import { InterruptionPrefix, withInterruptions } from '@auth0/ai-vercel/interrupts';
import { Auth0Interrupt } from '@auth0/ai/interrupts';
import { context, trace } from '@opentelemetry/api';
import { setSession, setUser } from '@arizeai/openinference-core';
import { auth0 } from '@/lib/auth0';

import { serpApiTool } from '@/lib/tools/serpapi';
import { getUserInfoTool } from '@/lib/tools/user-info';
import { gmailDraftTool, gmailSearchTool } from '@/lib/tools/google-mail';
import { getCalendarEventsTool } from '@/lib/tools/google-calender';
import { getTasksTool, createTasksTool } from '@/lib/tools/google-tasks';
import { shopSearchTool } from '@/lib/tools/shop-search';
import { shopOnlineTool } from '@/lib/tools/shop-online';
import { getContextDocumentsTool } from '@/lib/tools/context-docs';
import { listRepositories } from '@/lib/tools/list-gh-repos';
import { listGitHubEvents } from '@/lib/tools/list-gh-events';
import { listSlackChannels } from '@/lib/tools/list-slack-channels';

// Local error serializer — uses Auth0Interrupt.isInterrupt() (name-based)
// instead of `instanceof` which fails across Turbopack module boundaries.
function authErrorSerializer(errHandler: (err: unknown) => string) {
  return (error: any) => {
    if (!Auth0Interrupt.isInterrupt(error.cause)) {
      return errHandler(error);
    }
    const serializableError = {
      ...error.cause.toJSON(),
      toolCall: {
        id: error.toolCallId,
        args: error.toolArgs,
        name: error.toolName,
      },
    };
    return `${InterruptionPrefix}${JSON.stringify(serializableError)}`;
  };
}

const date = new Date().toISOString();

const AGENT_SYSTEM_TEMPLATE = `You are a personal assistant named Assistant0. You are a helpful assistant that can answer questions and help with tasks.
You have access to a set of tools. When using tools, you MUST provide valid JSON arguments. Always format tool call arguments as proper JSON objects.
Use the tools as needed to answer the user's question. When a user's request can be answered by calling a tool, call the tool immediately using sensible defaults for any optional parameters. Do not ask the user to clarify optional parameters — just make the call and present the results.
When a user asks to buy something, always use shopSearchTool first to look up the product and get real pricing. Then immediately call shopOnlineTool with the product details extracted from the search results:
- productId: product.id
- productName: product.name
- qty: qty
- unitPrice: product.pricePerUnit
- total: total
- imageUrl: product.imageUrl
Do not ask the user to confirm before purchasing — the CIBA authorization on their mobile device handles approval.
Render the email body as a markdown block, do not wrap it in code blocks. The current date and time is ${date}.`;

/**
 * This handler initializes and calls an tool calling agent.
 */
export async function POST(req: NextRequest) {
  const { id, messages }: { id: string; messages: Array<UIMessage> } = await req.json();

  setAIContext({ threadID: id });

  const authSession = await auth0.getSession();
  const userId = authSession?.user.sub ?? 'anonymous';
  const activeContext = setUser(setSession(context.active(), { sessionId: id }), { userId });

  const tools = {
    ...(serpApiTool ? { serpApiTool } : {}),
    getUserInfoTool,
    gmailSearchTool,
    gmailDraftTool,
    getCalendarEventsTool,
    getTasksTool,
    createTasksTool,
    shopSearchTool,
    shopOnlineTool,
    getContextDocumentsTool,
    listRepositories,
    listGitHubEvents,
    listSlackChannels,
  };

  const modelMessages = await convertToModelMessages(messages);

  const stream = createUIMessageStream({
    originalMessages: messages,
    execute: withInterruptions(
      async ({ writer }) => {
        await context.with(activeContext, async () => {
          const result = streamText({
            model: openai.chat('gpt-5-mini'),
            system: AGENT_SYSTEM_TEMPLATE,
            messages: modelMessages,
            tools: tools as any,
            stopWhen: stepCountIs(5),
            experimental_telemetry: {
              isEnabled: true,
              functionId: 'assistant0-chat',
            },
            onStepFinish: (step) => {
              // Detect auth interrupts immediately when the step finishes,
              // BEFORE the LLM gets a second turn to generate verbose error text.
              // Cannot use onFinish (notify() swallows errors) or stopWhen
              // (only evaluated for client-side tool calls).
              for (const part of step.content) {
                if (part.type === 'tool-error' && Auth0Interrupt.isInterrupt((part as any).error)) {
                  const { toolName, toolCallId, error, input } = part as any;
                  const serializableError = {
                    ...(error as any).toJSON(),
                    toolCall: { id: toolCallId, args: input, name: toolName },
                  };
                  writer.write({
                    type: 'error',
                    errorText: `${InterruptionPrefix}${JSON.stringify(serializableError)}`,
                  } as any);
                  return;
                }
              }
            },
          });

          await writer.merge(
            result.toUIMessageStream({
              sendReasoning: true,
            }),
          );

          try {
            await (trace.getTracerProvider() as any).forceFlush?.();
          } catch {
            // Spans may have already ended; ignore flush errors.
          }
        });
      },
      {
        messages: messages,
        tools: tools as any,
      },
    ),
    onError: authErrorSerializer((err) => {
      console.log(err);
      return `An error occurred! ${(err as Error).message}`;
    }),
  });

  return createUIMessageStreamResponse({ stream });
}
