#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT_DIR = path.resolve(new URL('..', import.meta.url).pathname);
const DEFAULT_SUMMARY_PATH = '.planning/reports/phase11/k6-summary.json';
const DEFAULT_RESULTS_PATH = '.planning/reports/phase11/load-results.json';
const K6_SCRIPT = 'scripts/phase11-load.k6.js';

export function resolveBaseUrl(env = process.env) {
  return (
    env.PHASE11_LOAD_BASE_URL ||
    env.PHASE11_STAGING_BASE_URL ||
    env.TARGET_URL ||
    ''
  ).replace(/\/+$/, '');
}

export function assertSafeTarget(baseUrl, env = process.env) {
  if (!baseUrl) {
    throw new Error(
      'PHASE11_LOAD_BASE_URL or PHASE11_STAGING_BASE_URL is required',
    );
  }

  const profile = env.PHASE11_LOAD_PROFILE || 'full';
  if (profile !== 'full') return;

  const requiredFlags = [
    'PHASE11_LOAD_ENV_READY',
    'PHASE11_LOAD_EXTERNALS_MOCKED',
    'PHASE11_STAGING_RESET_CONFIRMED',
    'PHASE11_ALLOW_10K_LOAD',
    'PHASE11_LOAD_AUCTION_IDS',
    'PHASE11_LOAD_BUYER_TOKENS',
  ];

  for (const flag of requiredFlags) {
    const value = env[flag];
    const expectsValue = flag.endsWith('_IDS') || flag.endsWith('_TOKENS');
    const valid = expectsValue ? Boolean(value) : value === 'true';
    if (!valid) {
      throw new Error(
        expectsValue
          ? `${flag} is required for full 10K load`
          : `${flag}=true is required for full 10K load`,
      );
    }
  }

  const { hostname } = new URL(baseUrl);
  const stagingLike = /(^localhost$|^127\.0\.0\.1$|^\[?::1\]?$|stage|staging|test|sandbox)/i.test(
    hostname,
  );
  if (!stagingLike && env.PHASE11_CONFIRM_STAGING_TARGET !== 'true') {
    throw new Error(
      'PHASE11_CONFIRM_STAGING_TARGET=true is required for production-like hostnames',
    );
  }
}

function metricValue(summary, name, valueName, fallback = 0) {
  const metric = summary?.metrics?.[name];
  const value =
    metric?.values?.[valueName] ??
    metric?.[valueName] ??
    (valueName === 'rate' ? metric?.value : undefined);
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function parseK6Summary(summary, env = process.env) {
  const bidWindowSeconds = Number(env.PHASE11_BID_BURST_WINDOW_SECONDS || 10);
  const bidAttempts = metricValue(summary, 'phase11_bid_attempts', 'count');
  const webhookTarget =
    Number(env.PHASE11_WEBHOOK_CONCURRENCY || 0) ||
    metricValue(summary, 'phase11_payment_webhooks', 'count');

  return {
    concurrent_users: metricValue(summary, 'vus_max', 'max'),
    http_req_duration_p95_ms: metricValue(
      summary,
      'http_req_duration',
      'p(95)',
    ),
    error_rate: metricValue(summary, 'http_req_failed', 'rate'),
    ws_connections: metricValue(summary, 'phase11_ws_connections', 'count'),
    ws_broadcast_p95_ms: metricValue(
      summary,
      'phase11_ws_broadcast_ms',
      'p(95)',
    ),
    bid_burst_per_10s:
      bidWindowSeconds > 0
        ? Math.round((bidAttempts / bidWindowSeconds) * 10)
        : bidAttempts,
    duplicate_bids: metricValue(summary, 'phase11_duplicate_bids', 'count'),
    lost_bids: metricValue(summary, 'phase11_lost_bids', 'count'),
    webhook_concurrency: webhookTarget,
  };
}

function absolutePath(relativeOrAbsolutePath) {
  return path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(ROOT_DIR, relativeOrAbsolutePath);
}

async function writeJson(filePath, data) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(`${filePath}.tmp`, `${JSON.stringify(data, null, 2)}\n`);
  await import('node:fs/promises').then(({ rename }) =>
    rename(`${filePath}.tmp`, filePath),
  );
}

function runCommand(command, args, env) {
  return spawnSync(command, args, {
    cwd: ROOT_DIR,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function main() {
  const env = { ...process.env };
  const baseUrl = resolveBaseUrl(env);
  assertSafeTarget(baseUrl, env);

  const summaryPath = absolutePath(
    env.PHASE11_K6_SUMMARY_JSON || DEFAULT_SUMMARY_PATH,
  );
  const resultsPath = absolutePath(
    env.PHASE11_LOAD_RESULTS_JSON || DEFAULT_RESULTS_PATH,
  );

  const k6Path = runCommand('which', ['k6'], env);
  if (k6Path.status !== 0) {
    throw new Error('k6 is not installed or not on PATH');
  }

  await mkdir(path.dirname(summaryPath), { recursive: true });

  const k6Env = {
    ...env,
    PHASE11_LOAD_BASE_URL: baseUrl,
    PHASE11_K6_SUMMARY_JSON: summaryPath,
  };
  const k6Result = runCommand(
    'k6',
    ['run', '--summary-export', summaryPath, K6_SCRIPT],
    k6Env,
  );

  if (k6Result.stdout) process.stdout.write(k6Result.stdout);
  if (k6Result.stderr) process.stderr.write(k6Result.stderr);

  if (!existsSync(summaryPath)) {
    throw new Error(`k6 summary was not written: ${summaryPath}`);
  }

  const summary = JSON.parse(await readFile(summaryPath, 'utf8'));
  const metrics = parseK6Summary(summary, env);
  await writeJson(resultsPath, metrics);

  const reportEnv = {
    ...env,
    PHASE11_LOAD_ENV_READY: 'true',
    PHASE11_LOAD_EXTERNALS_MOCKED: 'true',
    PHASE11_LOAD_RESULTS_JSON: resultsPath,
  };
  const evidenceResult = runCommand(
    'npm',
    ['--prefix', 'backend', 'run', 'phase11:load'],
    reportEnv,
  );

  if (evidenceResult.stdout) process.stdout.write(evidenceResult.stdout);
  if (evidenceResult.stderr) process.stderr.write(evidenceResult.stderr);

  if (k6Result.status !== 0) {
    process.exit(k6Result.status ?? 1);
  }
  if (evidenceResult.status !== 0) {
    process.exit(evidenceResult.status ?? 1);
  }

  process.stdout.write(
    `Phase 11 load results written to ${path.relative(ROOT_DIR, resultsPath)}\n`,
  );
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || '')) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
