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
import { RootAwareOpenInferenceProcessor } from './utils/root-aware-processor';

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

// Workaround for ai@6.x bug: experimental_telemetry passes performance.now()
// (ms since process start) to span.end() instead of Date.now() (Unix epoch ms).
// OTel interprets the small value as a Unix ms timestamp → endTime ≈ [2, ...],
// producing the "startTime > endTime" warning and 0ms span durations in Arize.
// This processor corrects the endTime to wall-clock time before export.
class FixSpanTimingProcessor {
  onStart(_span: Span, _parentContext: Context): void {}
  onEnd(span: ReadableSpan): void {
    const [endSecs] = span.endTime;
    const [startSecs] = span.startTime;
    if (endSecs < startSecs) {
      const nowMs = Date.now();
      (span as any)._endTime = [Math.floor(nowMs / 1000), (nowMs % 1000) * 1_000_000];
    }
  }
  shutdown(): Promise<void> {
    return Promise.resolve();
  }
  forceFlush(): Promise<void> {
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
        // new OpenInferenceSimpleSpanProcessor({
        //   exporter: new LoggingExporter(
        //     new OTLPTraceExporter({
        //       url: 'https://otlp.arize.com/v1/traces',
        //       headers: {
        //         space_id: process.env.ARIZE_SPACE_ID ?? '',
        //         api_key: process.env.ARIZE_API_KEY ?? '',
        //       },
        //     }),
        //   ),
        //   spanFilter: isOpenInferenceSpan,
        // }),
        new FixSpanTimingProcessor(), // ← new: fix endTime before export
        new RootAwareOpenInferenceProcessor({ // New processor
          exporter: new LoggingExporter(
            new OTLPTraceExporter({
              url: 'https://otlp.arize.com/v1/traces',
              headers: {
                space_id: process.env.ARIZE_SPACE_ID ?? '',
                api_key: process.env.ARIZE_API_KEY ?? '',
              },
            }),
          ),
        }),
      ],
    });
  }
}
