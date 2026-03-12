import { registerOTel } from '@vercel/otel';
import {
  isOpenInferenceSpan,
  OpenInferenceSimpleSpanProcessor,
} from '@arizeai/openinference-vercel';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import {
  type Context,
  diag,
  DiagConsoleLogger,
  DiagLogLevel,
} from '@opentelemetry/api';
import type { ExportResult } from '@opentelemetry/core';
import type { ReadableSpan, Span, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { getSession, getUser } from '@arizeai/openinference-core';
import { SESSION_ID, USER_ID } from '@arizeai/openinference-semantic-conventions';

// Captures OTLP export errors and OTel pipeline warnings
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.WARN);

const SERVICE_NAME = 'assistant0';

class SessionUserSpanProcessor {
  onStart(span: Span, parentContext: Context) {
    const session = getSession(parentContext);
    const user = getUser(parentContext);
    if (session?.sessionId) span.setAttribute(SESSION_ID, session.sessionId);
    if (user?.userId) span.setAttribute(USER_ID, user.userId);
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[Arize] span started: "${span.name}" — session: ${session?.sessionId ?? 'MISSING'}, user: ${user?.userId ?? 'MISSING'}`,
      );
    }
  }
  onEnd(_span: ReadableSpan) {}
  shutdown() {
    return Promise.resolve();
  }
  forceFlush() {
    return Promise.resolve();
  }
}

class LoggingExporter implements SpanExporter {
  constructor(private inner: SpanExporter) {}
  export(spans: ReadableSpan[], cb: (result: ExportResult) => void) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[Arize] exporting ${spans.length} span(s):`,
        spans.map((s) => s.name),
      );
    }
    this.inner.export(spans, (result) => {
      if (result.error) {
        console.error('[Arize] export FAILED:', result.error);
      } else if (process.env.NODE_ENV !== 'production') {
        console.log('[Arize] export SUCCESS');
      }
      cb(result);
    });
  }
  shutdown() {
    return this.inner.shutdown();
  }
  forceFlush() {
    return this.inner.forceFlush?.() ?? Promise.resolve();
  }
}

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Arize] register() called (runtime: nodejs)');
    console.log(
      `[Arize] ARIZE_SPACE_ID: ${process.env.ARIZE_SPACE_ID ? 'set' : 'MISSING'} | ARIZE_API_KEY: ${process.env.ARIZE_API_KEY ? 'set' : 'MISSING'}`,
    );
    registerOTel({
      serviceName: SERVICE_NAME,
      attributes: {
        model_id: SERVICE_NAME,
      },
      spanProcessors: [
        new SessionUserSpanProcessor(),
        new OpenInferenceSimpleSpanProcessor({
          exporter: new LoggingExporter(
            new OTLPTraceExporter({
              url: 'https://otlp.arize.com/v1/traces',
              headers: {
                space_id: process.env.ARIZE_SPACE_ID ?? '',
                api_key: process.env.ARIZE_API_KEY ?? '',
              },
            }),
          ),
          spanFilter: isOpenInferenceSpan,
        }),
      ],
    });
  }
}
