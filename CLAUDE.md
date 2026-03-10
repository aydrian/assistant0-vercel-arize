# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npm run format       # Prettier format src/

# Database (requires postgres running via docker compose)
docker compose up -d          # Start PostgreSQL + pgvector
npm run db:migrate            # Apply migrations (run once after clone)
npm run db:generate           # Generate new migrations from schema changes
npm run db:push               # Push schema directly (dev only)
npm run db:studio             # Open Drizzle Studio UI

npm run fga:init     # Initialize Auth0 FGA store (run once after clone)

ANALYZE=true npm run build    # Interactive bundle analysis
```

## Architecture

### Overview
Assistant0 is a Next.js 15 App Router app — an AI personal assistant secured with Auth0. The agent uses Vercel AI SDK's `streamText` with tool calling (gpt-4o-mini) to provide Gmail, Google Calendar, Google Tasks, GitHub, Slack, web search, RAG, and online shopping capabilities.

### Request Flow
1. [src/middleware.ts](src/middleware.ts) — Auth0 middleware secures all routes; unauthenticated requests redirect to `/auth/login`
2. [src/app/page.tsx](src/app/page.tsx) — Chat UI using `useChat` from `@ai-sdk/react`
3. `POST /api/chat` ([src/app/api/chat/route.ts](src/app/api/chat/route.ts)) — Streams AI responses via `createUIMessageStream` + `streamText`; all tools are registered here

### Tools ([src/lib/tools/](src/lib/tools/))
Each file exports one or more Vercel AI SDK `tool()` objects. Tools requiring third-party OAuth access wrap their `execute` function with a `with*` helper from [src/lib/auth0-ai.ts](src/lib/auth0-ai.ts). The shop tool uses CIBA async user authorization (`withAsyncAuthorization`).

### Auth0 AI / Token Vault ([src/lib/auth0-ai.ts](src/lib/auth0-ai.ts))
- `withGmailRead`, `withGmailWrite`, `withCalendar`, `withTasks` — Google OAuth via Auth0 Token Vault
- `withGitHubConnection` — GitHub OAuth
- `withSlack` — Slack OAuth
- `withAsyncAuthorization` — CIBA flow requiring explicit user approval (used by shop tool)

### RAG Pipeline
- Documents uploaded via `/documents` → stored in `documents` table, chunked and embedded with `text-embedding-3-small`, stored in `embeddings` table (pgvector, 1536-dim)
- [src/lib/rag/embedding.ts](src/lib/rag/embedding.ts): `generateEmbeddings()`, `findRelevantContent()` (cosine distance, threshold 0.5)
- [src/lib/tools/context-docs.ts](src/lib/tools/context-docs.ts): RAG tool that fetches relevant chunks then filters through FGA `can_view` check

### FGA (Fine-Grained Authorization) ([src/lib/fga/](src/lib/fga/))
- [src/lib/fga/fga.ts](src/lib/fga/fga.ts) — wraps `buildOpenFgaClient()` from `@auth0/ai`; `addRelation`/`deleteRelation` manage doc ownership
- [src/lib/fga/schema.fga](src/lib/fga/schema.fga) — authorization model
- RAG tool uses `FGAFilter` to enforce per-document access before returning results

### Database ([src/lib/db/](src/lib/db/))
- Drizzle ORM + PostgreSQL; schema in [src/lib/db/schema/](src/lib/db/schema/), migrations in [src/lib/db/migrations/](src/lib/db/migrations/)
- `drizzle.config.ts` reads `DATABASE_URL` from `.env.local`

## Environment Variables
Copy `.env.example` to `.env.local`:

| Variable | Purpose |
|---|---|
| `OPENAI_API_KEY` | Required — LLM + embeddings |
| `AUTH0_SECRET`, `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` | Required — Auth0 Web App |
| `APP_BASE_URL` | Required — callback URL (default: `http://localhost:3000`) |
| `DATABASE_URL` | Required — PostgreSQL connection string |
| `FGA_STORE_ID`, `FGA_CLIENT_ID`, `FGA_CLIENT_SECRET`, `FGA_API_URL`, `FGA_API_AUDIENCE` | Required — Auth0 FGA |
| `SERPAPI_API_KEY` | Optional — web search tool |
| `ANTHROPIC_API_KEY` | Optional — alternative model |
| `SHOP_API_URL`, `SHOP_API_AUDIENCE` | Optional — shop tool |
| `NEXT_PUBLIC_DEMO` | Optional — enables demo mode |

## Adding a New Tool
1. Create `src/lib/tools/your-tool.ts` exporting a `tool()` from `ai`
2. If it needs OAuth, wrap `execute` with the appropriate `with*` helper from `src/lib/auth0-ai.ts` (or add a new one)
3. Import and add to the `tools` object in `src/app/api/chat/route.ts`
