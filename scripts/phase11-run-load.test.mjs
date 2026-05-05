import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertSafeTarget,
  parseK6Summary,
  resolveBaseUrl,
} from './phase11-run-load.mjs';

test('resolveBaseUrl prefers explicit load URL before staging URL', () => {
  assert.equal(
    resolveBaseUrl({
      PHASE11_LOAD_BASE_URL: 'https://load.stage.example.test',
      PHASE11_STAGING_BASE_URL: 'https://stage.example.test',
    }),
    'https://load.stage.example.test',
  );
});

test('assertSafeTarget blocks full 10K load without explicit launch gates', () => {
  assert.throws(
    () =>
      assertSafeTarget('https://stage.example.test', {
        PHASE11_LOAD_PROFILE: 'full',
      }),
    /PHASE11_LOAD_ENV_READY=true/,
  );
});

test('assertSafeTarget requires staging confirmation for production-like hostnames', () => {
  assert.throws(
    () =>
      assertSafeTarget('https://api.endemigo.com', {
        PHASE11_LOAD_PROFILE: 'full',
        PHASE11_LOAD_ENV_READY: 'true',
        PHASE11_LOAD_EXTERNALS_MOCKED: 'true',
        PHASE11_STAGING_RESET_CONFIRMED: 'true',
        PHASE11_ALLOW_10K_LOAD: 'true',
        PHASE11_LOAD_AUCTION_IDS: 'auction-1',
        PHASE11_LOAD_BUYER_TOKENS: 'token-1',
      }),
    /PHASE11_CONFIRM_STAGING_TARGET=true/,
  );
});

test('parseK6Summary converts k6 summary metrics to Phase 11 evidence metrics', () => {
  const metrics = parseK6Summary(
    {
      metrics: {
        vus_max: { values: { max: 10000 } },
        http_req_duration: { values: { 'p(95)': 123.4 } },
        http_req_failed: { values: { rate: 0.0005 } },
        phase11_ws_connections: { values: { count: 5000 } },
        phase11_ws_broadcast_ms: { values: { 'p(95)': 321.2 } },
        phase11_bid_attempts: { values: { count: 1000 } },
        phase11_duplicate_bids: { values: { count: 0 } },
        phase11_lost_bids: { values: { count: 0 } },
        phase11_payment_webhooks: { values: { count: 100 } },
      },
    },
    {
      PHASE11_LOAD_PROFILE: 'full',
      PHASE11_BID_BURST_WINDOW_SECONDS: '10',
    },
  );

  assert.deepEqual(metrics, {
    concurrent_users: 10000,
    http_req_duration_p95_ms: 123.4,
    error_rate: 0.0005,
    ws_connections: 5000,
    ws_broadcast_p95_ms: 321.2,
    bid_burst_per_10s: 1000,
    duplicate_bids: 0,
    lost_bids: 0,
    webhook_concurrency: 100,
  });
});

test('parseK6Summary supports k6 summary-export direct metric values', () => {
  const metrics = parseK6Summary(
    {
      metrics: {
        vus_max: { max: 11 },
        http_req_duration: { 'p(95)': 2.42 },
        http_req_failed: { value: 0.99 },
        phase11_ws_connections: { count: 4 },
        phase11_ws_broadcast_ms: { 'p(95)': 86.2 },
        phase11_bid_attempts: { count: 5 },
        phase11_duplicate_bids: { count: 0 },
        phase11_lost_bids: { count: 2 },
        phase11_payment_webhooks: { count: 10 },
      },
    },
    {
      PHASE11_LOAD_PROFILE: 'smoke',
      PHASE11_BID_BURST_WINDOW_SECONDS: '10',
    },
  );

  assert.equal(metrics.concurrent_users, 11);
  assert.equal(metrics.http_req_duration_p95_ms, 2.42);
  assert.equal(metrics.error_rate, 0.99);
  assert.equal(metrics.ws_connections, 4);
  assert.equal(metrics.bid_burst_per_10s, 5);
  assert.equal(metrics.lost_bids, 2);
  assert.equal(metrics.webhook_concurrency, 10);
});
