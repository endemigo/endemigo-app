import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const ROOT_DIR = path.resolve(new URL('..', import.meta.url).pathname);
const GENERATOR_PATH = path.join(ROOT_DIR, 'scripts/phase11-evidence.mjs');
const REPORT_DIR = path.join(ROOT_DIR, '.planning/reports/phase11');

const PHASE11_ENV_KEYS = [
  'PHASE11_STAGING_BASE_URL',
  'PHASE11_ALLOW_AGGRESSIVE_STAGING',
  'PHASE11_STAGING_RESET_CONFIRMED',
  'PHASE11_LOAD_RESULTS_JSON',
  'PHASE11_LOAD_ENV_READY',
  'PHASE11_LOAD_EXTERNALS_MOCKED',
];

function phase11Env(overrides = {}) {
  const env = { ...process.env };
  for (const key of PHASE11_ENV_KEYS) {
    delete env[key];
  }
  return { ...env, ...overrides };
}

function runGenerator(args, envOverrides = {}) {
  return spawnSync(process.execPath, [GENERATOR_PATH, ...args], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    env: phase11Env(envOverrides),
  });
}

async function readReport(fileName) {
  return JSON.parse(await readFile(path.join(REPORT_DIR, fileName), 'utf8'));
}

after(() => {
  runGenerator(['--all']);
});

test('backend package exposes repeatable Phase 11 commands', async () => {
  const packageJson = JSON.parse(await readFile(path.join(ROOT_DIR, 'backend/package.json'), 'utf8'));
  for (const scriptName of ['phase11:functional', 'phase11:security', 'phase11:load', 'phase11:load:run', 'phase11:reports', 'phase11:nyquist']) {
    assert.equal(typeof packageJson.scripts[scriptName], 'string', `${scriptName} must exist`);
  }
});

test('all Phase 11 reports regenerate with no code/test/security/load blockers', async () => {
  const result = runGenerator(['--all']);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  for (const fileName of [
    'functional-test-report.md',
    'functional-test-report.json',
    'security-test-report.md',
    'security-test-report.json',
    'load-test-report.md',
    'load-test-report.json',
    'launch-readiness-index.md',
    'launch-readiness-index.json',
  ]) {
    assert.equal(existsSync(path.join(REPORT_DIR, fileName)), true, `${fileName} must exist`);
  }

  for (const fileName of ['functional-test-report.json', 'security-test-report.json', 'load-test-report.json', 'launch-readiness-index.json']) {
    const report = await readReport(fileName);
    assert.deepEqual(report.code_test_security_load_blockers, [], `${fileName} must not have code blockers`);
  }
});

test('security report keeps missing aggressive staging inputs as environment blockers', async () => {
  const result = runGenerator(['--security']);
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = await readReport('security-test-report.json');
  assert.deepEqual(report.code_test_security_load_blockers, []);
  assert.ok(
    report.environment_blockers.some((blocker) => blocker.reason.includes('PHASE11_STAGING_BASE_URL')),
    'staging URL precondition must be an environment blocker',
  );
  assert.ok(
    report.environment_blockers.some((blocker) => blocker.reason.includes('PHASE11_ALLOW_AGGRESSIVE_STAGING=true')),
    'aggressive staging opt-in must be an environment blocker',
  );
  assert.ok(
    report.environment_blockers.some((blocker) => blocker.reason.includes('PHASE11_STAGING_RESET_CONFIRMED=true')),
    'reset confirmation must be an environment blocker',
  );
});

test('failing supplied load metrics become code/test/security/load blockers', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'phase11-load-fail-'));
  const metricsPath = path.join(tmpDir, 'metrics.json');
  await writeFile(metricsPath, JSON.stringify({
    concurrent_users: 9999,
    http_req_duration_p95_ms: 201,
    error_rate: 0.002,
    ws_connections: 4999,
    ws_broadcast_p95_ms: 501,
    bid_burst_per_10s: 999,
    duplicate_bids: 1,
    lost_bids: 1,
    webhook_concurrency: 99,
  }));

  const result = runGenerator(['--load'], {
    PHASE11_LOAD_RESULTS_JSON: metricsPath,
    PHASE11_LOAD_ENV_READY: 'true',
    PHASE11_LOAD_EXTERNALS_MOCKED: 'true',
  });

  await rm(tmpDir, { force: true, recursive: true });
  assert.notEqual(result.status, 0, 'failing metrics must make the load report command fail');

  const report = await readReport('load-test-report.json');
  assert.ok(report.code_test_security_load_blockers.length >= 1, 'failing metrics must create code/test/security/load blockers');
  assert.ok(
    report.code_test_security_load_blockers.some((blocker) => blocker.source === 'load-targets'),
    'load target failures must be classified under load-targets',
  );
});

test('passing supplied load metrics clear load-target code blockers', async () => {
  const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'phase11-load-pass-'));
  const metricsPath = path.join(tmpDir, 'metrics.json');
  await writeFile(metricsPath, JSON.stringify({
    concurrent_users: 10000,
    http_req_duration_p95_ms: 200,
    error_rate: 0.001,
    ws_connections: 5000,
    ws_broadcast_p95_ms: 500,
    bid_burst_per_10s: 1000,
    duplicate_bids: 0,
    lost_bids: 0,
    webhook_concurrency: 100,
  }));

  const result = runGenerator(['--load'], {
    PHASE11_LOAD_RESULTS_JSON: metricsPath,
    PHASE11_LOAD_ENV_READY: 'true',
    PHASE11_LOAD_EXTERNALS_MOCKED: 'true',
  });

  await rm(tmpDir, { force: true, recursive: true });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const report = await readReport('load-test-report.json');
  assert.deepEqual(report.code_test_security_load_blockers, []);
  assert.ok(
    report.checks.some((check) => check.id === 'load:concurrent_users' && check.status === 'pass'),
    'passing metrics must be recorded as load checks',
  );
});
