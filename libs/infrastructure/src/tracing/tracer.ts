import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import {
  CompositePropagator,
  W3CTraceContextPropagator,
  W3CBaggagePropagator,
} from '@opentelemetry/core';
import { propagation, trace } from '@opentelemetry/api';

let sdk: NodeSDK | null = null;

/**
 * Initialise the OpenTelemetry SDK for a given service.
 * MUST be called as the very first statement inside bootstrap(), before
 * NestFactory.create(), so that auto-instrumentation patches run before any
 * modules are loaded.
 *
 * @param serviceName  Logical service name (e.g. 'workflow-engine')
 * @param serviceVersion  Semver string (default: '1.0.0')
 */
export function initTracer(
  serviceName: string,
  serviceVersion = '1.0.0',
): NodeSDK {
  const otlpEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318';
  const environment = process.env.NODE_ENV ?? 'development';
  const isDev = environment === 'development';

  // W3C TraceContext (traceparent / tracestate) + W3C Baggage propagators
  const propagator = new CompositePropagator({
    propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
  });
  propagation.setGlobalPropagator(propagator);

  const traceExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  });

  const spanProcessor = isDev
    ? new SimpleSpanProcessor(traceExporter)   // synchronous — simpler for local dev
    : new BatchSpanProcessor(traceExporter, {  // batched — lower overhead in prod
        maxQueueSize: 1000,
        scheduledDelayMillis: 5000,
      });

  sdk = new NodeSDK({
    resource: new Resource({
      [SEMRESATTRS_SERVICE_NAME]: serviceName,
      [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
      [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
      'welo.platform': 'true',
    }),
    spanProcessor: spanProcessor as any, // Type cast to avoid OpenTelemetry version mismatch
    instrumentations: [
      getNodeAutoInstrumentations({
        // HTTP instrumentation — captures incoming/outgoing HTTP spans
        '@opentelemetry/instrumentation-http': { enabled: true },
        // Express/Fastify — route-level spans
        '@opentelemetry/instrumentation-express': { enabled: true },
        // PostgreSQL via pg driver
        '@opentelemetry/instrumentation-pg': { enabled: true },
        // ioredis
        '@opentelemetry/instrumentation-ioredis': { enabled: true },
        // NestJS core
        '@opentelemetry/instrumentation-nestjs-core': { enabled: true },
        // KafkaJS — produces producer/consumer spans
        '@opentelemetry/instrumentation-kafkajs': { enabled: true },
        // Suppress noisy dns/net/fs instrumentations
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  // Graceful shutdown — flush pending spans before process exits
  process.on('SIGTERM', async () => {
    try {
      await sdk!.shutdown();
    } catch {
      // ignore shutdown errors
    }
  });

  return sdk;
}

/**
 * Returns the active tracer for manual span creation.
 */
export function getTracer(name: string) {
  return trace.getTracer(name);
}
