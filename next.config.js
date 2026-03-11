const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
module.exports = withBundleAnalyzer({
  serverExternalPackages: [
    'pdf-parse',
    '@opentelemetry/api',
    '@opentelemetry/sdk-trace-base',
    '@opentelemetry/sdk-trace-node',
    '@opentelemetry/exporter-trace-otlp-proto',
    '@opentelemetry/resources',
    '@opentelemetry/semantic-conventions',
    '@arizeai/openinference-core',
    '@arizeai/openinference-vercel',
    '@arizeai/openinference-semantic-conventions',
    '@vercel/otel',
  ],
});
