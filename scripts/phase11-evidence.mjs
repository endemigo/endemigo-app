#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = path.resolve(new URL('..', import.meta.url).pathname);
const REPORT_DIR = path.join(ROOT_DIR, '.planning/reports/phase11');
const ARGS = new Set(process.argv.slice(2));

const FILES = {
  functionalMarkdown: 'functional-test-report.md',
  functionalJson: 'functional-test-report.json',
  securityMarkdown: 'security-test-report.md',
  securityJson: 'security-test-report.json',
  loadMarkdown: 'load-test-report.md',
  loadJson: 'load-test-report.json',
  indexMarkdown: 'launch-readiness-index.md',
  indexJson: 'launch-readiness-index.json',
};

const REQUIRED_PHASE10_REPORTS = [
  '.planning/reports/phase10/staging-regression-report.md',
  '.planning/reports/phase10/contract-drift.md',
  '.planning/reports/phase10/endpoint-inventory.md',
  '.planning/reports/phase10/monitoring-readiness.md',
  '.planning/reports/phase10/blockers.json',
];

const REQUIRED_CANONICAL_REFS = [
  '.planning/PROJECT.md',
  '.planning/REQUIREMENTS.md',
  '.planning/ROADMAP.md',
  '.planning/TEST_MATRIX.md',
  '.planning/CONTRACT_COVERAGE.md',
  'endemigo_fatih_yazilim_hizmet_sozlesmesi_taslak_v2.md',
  '.planning/phases/10-integration-ota-regression-hardening/10-CONTEXT.md',
  '.planning/phases/11-functional-security-load-testing/11-CONTEXT.md',
  'CONVENTIONS.md',
];

const FUNCTIONAL_COMMANDS = [
  ['backend/package.json', 'phase10:backend-gate'],
  ['admin/package.json', 'phase10:admin-gate'],
  ['mobile/package.json', 'phase10:mobile-gate'],
  ['backend/package.json', 'phase10:contracts'],
  ['mobile/package.json', 'ota:config:check'],
];

const PHASE11_COMMANDS = [
  ['backend/package.json', 'phase11:functional'],
  ['backend/package.json', 'phase11:security'],
  ['backend/package.json', 'phase11:load'],
  ['backend/package.json', 'phase11:load:run'],
  ['backend/package.json', 'phase11:reports'],
];

const SECURITY_SURFACES = [
  ['API validation and filters', ['backend/src/main.ts', 'backend/src/common/filters/global-exception.filter.ts'], [/ValidationPipe|class-validator/, /code|message/]],
  ['Helmet / HTTP hardening', ['backend/src/app.module.ts', 'backend/src/main.ts'], [/helmet/i]],
  ['Rate limiting', ['backend/src/app.module.ts', 'backend/src/modules/auth/auth.controller.ts'], [/Throttler|throttle/i]],
  ['User RBAC guard', ['backend/src/common/guards/roles.guard.ts', 'backend/src/common/decorators/roles.decorator.ts'], [/Roles|role/i]],
  ['Admin auth guard', ['backend/src/modules/admin-auth/guards/admin-jwt.guard.ts', 'backend/src/modules/admin-auth/admin-auth.service.ts'], [/AdminJwt|roles|SUPER_ADMIN/i]],
  ['Auction WebSocket auth', ['backend/src/modules/auction/auction.gateway.ts'], [/verify|jwt|authorization|token/i]],
  ['Negotiation WebSocket auth', ['backend/src/modules/negotiation/negotiation.gateway.ts'], [/verify|jwt|authorization|token/i]],
  ['Ask Price moderation', ['backend/src/modules/negotiation/content-moderation.service.ts'], [/iban|phone|url|violation/i]],
];

const LOAD_SCENARIOS = [
  {
    id: 'LOAD-01',
    name: '10K auction-weighted mixed workload',
    target: '10,000 concurrent users, staged ramp, 10 minute hold',
    thresholds: 'p95 < 200ms, error rate < 0.1%',
  },
  {
    id: 'LOAD-02',
    name: '1K bids per 10 seconds',
    target: 'Single auction bid burst',
    thresholds: '0 duplicate bids, 0 lost bids',
  },
  {
    id: 'LOAD-03',
    name: '5K WebSocket connections',
    target: 'Auction and negotiation socket connection pressure',
    thresholds: 'broadcast p95 < 500ms',
  },
  {
    id: 'LOAD-05',
    name: '100 concurrent payment webhooks',
    target: 'Payment idempotency pressure',
    thresholds: '0 duplicate provider events/orders/ledger entries',
  },
];

function newResult(name) {
  return {
    name,
    generatedAt: new Date().toISOString(),
    status: 'PASS',
    checks: [],
    code_test_security_load_blockers: [],
    environment_blockers: [],
    external_dependency_blockers: [],
  };
}

function setStatus(result) {
  if (result.code_test_security_load_blockers.length > 0) {
    result.status = 'FAIL';
  } else if (result.environment_blockers.length > 0 || result.external_dependency_blockers.length > 0) {
    result.status = 'PASS_WITH_ENVIRONMENT_OR_EXTERNAL_BLOCKERS';
  } else {
    result.status = 'PASS';
  }
}

function addCheck(result, id, status, notes) {
  result.checks.push({ id, status, notes });
}

function addCodeBlocker(result, source, reason) {
  result.code_test_security_load_blockers.push({ source, reason });
}

function addEnvironmentBlocker(result, source, reason) {
  result.environment_blockers.push({ source, reason });
}

function addExternalBlocker(result, source, reason) {
  result.external_dependency_blockers.push({ source, reason });
}

async function readProjectFile(relativePath) {
  try {
    return await readFile(path.join(ROOT_DIR, relativePath), 'utf8');
  } catch {
    return null;
  }
}

async function readJson(relativePath) {
  const source = await readProjectFile(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch {
    return null;
  }
}

function relativeReportPath(fileName) {
  return `.planning/reports/phase11/${fileName}`;
}

async function writeReport(result, markdownFile, jsonFile, markdown) {
  setStatus(result);
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(path.join(REPORT_DIR, jsonFile), `${JSON.stringify(result, null, 2)}\n`);
  await writeFile(path.join(REPORT_DIR, markdownFile), `${markdown}\n`);
  console.log(`Phase 11 report written: ${relativeReportPath(markdownFile)}`);
}

function blockerLines(blockers) {
  if (blockers.length === 0) return ['- None.'];
  return blockers.map((blocker) => `- ${blocker.source}: ${blocker.reason}`);
}

function checkRows(checks) {
  if (checks.length === 0) return ['| none | missing | No checks recorded. |'];
  return checks.map((check) => `| ${check.id} | ${check.status} | ${check.notes} |`);
}

function commandAvailable(command) {
  const result = spawnSync(command, ['version'], {
    cwd: ROOT_DIR,
    encoding: 'utf8',
    timeout: 3000,
  });
  return result.status === 0;
}

async function readPackageScript(packagePath, scriptName) {
  const source = await readProjectFile(packagePath);
  if (!source) return null;
  try {
    const parsed = JSON.parse(source);
    return parsed.scripts?.[scriptName] ?? null;
  } catch {
    return null;
  }
}

async function checkRequiredFiles(result, files, blockerPrefix) {
  for (const file of files) {
    if (existsSync(path.join(ROOT_DIR, file))) {
      addCheck(result, file, 'pass', 'file exists');
    } else {
      addCheck(result, file, 'fail', 'file missing');
      addCodeBlocker(result, blockerPrefix, `${file} is missing`);
    }
  }
}

async function checkPackageScripts(result, scripts, blockerPrefix) {
  for (const [packagePath, scriptName] of scripts) {
    const script = await readPackageScript(packagePath, scriptName);
    if (script) {
      addCheck(result, `${packagePath}:${scriptName}`, 'pass', script);
    } else {
      addCheck(result, `${packagePath}:${scriptName}`, 'fail', 'script missing');
      addCodeBlocker(result, blockerPrefix, `${packagePath} must define ${scriptName}`);
    }
  }
}

async function matrixSummary(result) {
  const source = await readProjectFile('.planning/TEST_MATRIX.md');
  if (!source) {
    addCodeBlocker(result, '.planning/TEST_MATRIX.md', 'test matrix is missing');
    return {
      functionalRows: 0,
      securityRows: 0,
      loadRows: 0,
      concurrencyRows: 0,
    };
  }

  const tableRows = source.split('\n').filter((line) => line.startsWith('|') && !line.includes('---'));
  const functionalRows = tableRows.filter((line) => /\|\s*Functional\s*\|/i.test(line)).length;
  const securityRows = tableRows.filter((line) => /\|\s*Security\s*\|/i.test(line)).length;
  const loadRows = tableRows.filter((line) => /LOAD-\d+|10\.000|concurrent users|WebSocket connections/i.test(line)).length;
  const concurrencyRows = tableRows.filter((line) => /CONC-\d+|Concurrency/i.test(line)).length;

  addCheck(result, 'TEST_MATRIX:functional', functionalRows > 0 ? 'pass' : 'fail', `${functionalRows} functional rows found`);
  addCheck(result, 'TEST_MATRIX:security', securityRows > 0 ? 'pass' : 'fail', `${securityRows} security rows found`);
  addCheck(result, 'TEST_MATRIX:load', loadRows > 0 ? 'pass' : 'fail', `${loadRows} load rows found`);
  addCheck(result, 'TEST_MATRIX:concurrency', concurrencyRows > 0 ? 'pass' : 'fail', `${concurrencyRows} concurrency rows found`);

  if (functionalRows === 0) addCodeBlocker(result, '.planning/TEST_MATRIX.md', 'functional rows are missing');
  if (securityRows === 0) addCodeBlocker(result, '.planning/TEST_MATRIX.md', 'security rows are missing');
  if (loadRows === 0) addCodeBlocker(result, '.planning/TEST_MATRIX.md', 'load rows are missing');
  if (concurrencyRows === 0) addCodeBlocker(result, '.planning/TEST_MATRIX.md', 'concurrency rows are missing');

  return { functionalRows, securityRows, loadRows, concurrencyRows };
}

async function copyPhase10Blockers(result, area) {
  const blockers = await readJson('.planning/reports/phase10/blockers.json');
  if (!blockers) {
    addCodeBlocker(result, '.planning/reports/phase10/blockers.json', 'Phase 10 blocker JSON is missing or invalid');
    return;
  }

  for (const blocker of blockers.code_test_contract_blockers ?? []) {
    addCodeBlocker(result, `phase10:${area}`, `${blocker.source}: ${blocker.reason}`);
  }
  for (const blocker of blockers.environment_blockers ?? []) {
    addEnvironmentBlocker(result, `phase10:${area}`, `${blocker.source}: ${blocker.reason}`);
  }
  for (const blocker of blockers.external_dependency_blockers ?? []) {
    addExternalBlocker(result, `phase10:${area}`, `${blocker.source}: ${blocker.reason}`);
  }
}

async function collectFiles(relativeDirs, predicate) {
  const files = [];
  async function walk(currentPath) {
    let entries;
    try {
      entries = await readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      const relative = path.relative(ROOT_DIR, entryPath);
      if (entry.isDirectory()) {
        if (['node_modules', 'dist', 'coverage', '.git', '.expo', '.planning.backup-20260426-182137'].includes(entry.name)) {
          continue;
        }
        await walk(entryPath);
      } else if (predicate(relative)) {
        files.push(entryPath);
      }
    }
  }

  for (const relativeDir of relativeDirs) {
    await walk(path.join(ROOT_DIR, relativeDir));
  }
  return files.sort();
}

async function scanHardCodedSecrets(result) {
  const files = await collectFiles(
    ['backend/src', 'admin/src', 'mobile/app', 'mobile/hooks', 'mobile/lib', 'mobile/services', 'mobile/store', 'shared-types', '.github/workflows', 'scripts'],
    (relative) => /\.(ts|tsx|js|mjs|json|yml|yaml)$/.test(relative) && !relative.endsWith('package-lock.json'),
  );

  const findings = [];
  const credentialPatterns = [
    /https?:\/\/[^/\s:@]+:[^/\s:@]+@[^/\s]+/i,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\b(?:api[_-]?key|secret|password|token|dsn)\s*[:=]\s*['"`](?!test|mock|example|placeholder|changeme|process\.env)[A-Za-z0-9_./:+-]{24,}['"`]/i,
  ];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const lines = source.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('process.env') || line.includes('secrets.') || line.includes('${{ secrets.')) return;
      if (credentialPatterns.some((pattern) => pattern.test(line))) {
        findings.push(`${path.relative(ROOT_DIR, file)}:${index + 1}`);
      }
    });
  }

  if (findings.length === 0) {
    addCheck(result, 'secret-scan', 'pass', `${files.length} source/config files scanned`);
  } else {
    addCheck(result, 'secret-scan', 'fail', `${findings.length} suspicious hard-coded credential findings`);
    addCodeBlocker(result, 'secret-scan', `suspicious hard-coded credentials: ${findings.join(', ')}`);
  }
}

async function checkSecuritySurfaces(result) {
  for (const [name, files, patterns] of SECURITY_SURFACES) {
    const sources = [];
    for (const file of files) {
      const source = await readProjectFile(file);
      if (source) sources.push(source);
    }
    const combined = sources.join('\n');
    const passed = sources.length > 0 && patterns.every((pattern) => pattern.test(combined));
    addCheck(result, `security:${name}`, passed ? 'pass' : 'fail', passed ? 'surface evidence found' : `missing pattern in ${files.join(', ')}`);
    if (!passed) {
      addCodeBlocker(result, `security:${name}`, `required security surface is missing or unverified`);
    }
  }
}

function checkAggressiveStagingReadiness(result) {
  if (!process.env.PHASE11_STAGING_BASE_URL) {
    addEnvironmentBlocker(result, 'security-staging', 'PHASE11_STAGING_BASE_URL is required to run aggressive staging security tests');
  }
  if (process.env.PHASE11_ALLOW_AGGRESSIVE_STAGING !== 'true') {
    addEnvironmentBlocker(result, 'security-staging', 'PHASE11_ALLOW_AGGRESSIVE_STAGING=true is required before destructive/aggressive checks run');
  }
  if (process.env.PHASE11_STAGING_RESET_CONFIRMED !== 'true') {
    addEnvironmentBlocker(result, 'security-staging', 'PHASE11_STAGING_RESET_CONFIRMED=true is required to confirm resettable, backed-up seed data');
  }
  addCheck(result, 'security:production-safety', 'pass', 'script does not target production by default');
}

async function generateFunctionalReport() {
  const result = newResult('Phase 11 Functional Test Report');
  await checkRequiredFiles(result, [...REQUIRED_CANONICAL_REFS, ...REQUIRED_PHASE10_REPORTS], 'functional-evidence');
  await checkPackageScripts(result, [...FUNCTIONAL_COMMANDS, ...PHASE11_COMMANDS], 'functional-scripts');
  const summary = await matrixSummary(result);
  await copyPhase10Blockers(result, 'functional');
  setStatus(result);

  const markdown = [
    '# Phase 11 Functional Test Report',
    '',
    '## Executive Status',
    '',
    `- Status: ${result.status}`,
    '- Functional evidence is based on `.planning/TEST_MATRIX.md` plus Phase 10 gate outputs.',
    '- Environment and external dependency blockers are listed separately.',
    `- Generated: ${result.generatedAt}`,
    '',
    '## Matrix Summary',
    '',
    `- Functional rows: ${summary.functionalRows}`,
    `- Security rows referenced for cross-check: ${summary.securityRows}`,
    `- Load rows referenced for Phase 11 handoff: ${summary.loadRows}`,
    `- Concurrency rows referenced for stress handoff: ${summary.concurrencyRows}`,
    '',
    '## Required Evidence Checks',
    '',
    '| check | status | notes |',
    '|---|---|---|',
    ...checkRows(result.checks),
    '',
    '## Manual Staging Checklist',
    '',
    '- Buyer: login, browse/search, product detail, auction bid, wallet/order/cargo/notification surfaces.',
    '- Seller: seller mode, product/auction operations, ads/campaign/membership surfaces.',
    '- Admin: login, priority work queues, operational action modal, reports/export, audit visibility.',
    '',
    '## Blocker Classification',
    '',
    '### code_test_security_load_blockers',
    '',
    ...blockerLines(result.code_test_security_load_blockers),
    '',
    '### environment_blockers',
    '',
    ...blockerLines(result.environment_blockers),
    '',
    '### external_dependency_blockers',
    '',
    ...blockerLines(result.external_dependency_blockers),
  ].join('\n');

  await writeReport(result, FILES.functionalMarkdown, FILES.functionalJson, markdown);
  return result;
}

async function generateSecurityReport() {
  const result = newResult('Phase 11 Security Test Report');
  await checkRequiredFiles(result, REQUIRED_CANONICAL_REFS, 'security-evidence');
  await checkPackageScripts(result, PHASE11_COMMANDS, 'security-scripts');
  await matrixSummary(result);
  await checkSecuritySurfaces(result);
  await scanHardCodedSecrets(result);
  checkAggressiveStagingReadiness(result);
  setStatus(result);

  const markdown = [
    '# Phase 11 Security Test Report',
    '',
    '## Executive Status',
    '',
    `- Status: ${result.status}`,
    '- Security mode: pen-test style against resettable production-like staging.',
    '- Production data and production systems are out of scope.',
    '- Critical and High findings are blockers.',
    `- Generated: ${result.generatedAt}`,
    '',
    '## Security Scope',
    '',
    '- Backend API: validation, response envelope, injection, auth/session, rate limit, RBAC.',
    '- Admin panel/API: admin JWT, role separation, controlled mutating actions, audit trail.',
    '- WebSocket: auction and negotiation namespace authentication/authorization.',
    '- Static checks: hard-coded credential scan and required security surface checks.',
    '',
    '## Required Evidence Checks',
    '',
    '| check | status | notes |',
    '|---|---|---|',
    ...checkRows(result.checks),
    '',
    '## Aggressive Staging Preconditions',
    '',
    '- `PHASE11_STAGING_BASE_URL` must point to the resettable staging target.',
    '- `PHASE11_ALLOW_AGGRESSIVE_STAGING=true` must be set before active/destructive checks.',
    '- `PHASE11_STAGING_RESET_CONFIRMED=true` must confirm backup/reset and seed-account readiness.',
    '',
    '## Blocker Classification',
    '',
    '### code_test_security_load_blockers',
    '',
    ...blockerLines(result.code_test_security_load_blockers),
    '',
    '### environment_blockers',
    '',
    ...blockerLines(result.environment_blockers),
    '',
    '### external_dependency_blockers',
    '',
    ...blockerLines(result.external_dependency_blockers),
  ].join('\n');

  await writeReport(result, FILES.securityMarkdown, FILES.securityJson, markdown);
  return result;
}

async function parseLoadResults(result) {
  const relativePath = process.env.PHASE11_LOAD_RESULTS_JSON;
  if (!relativePath) {
    addEnvironmentBlocker(result, 'load-results', 'PHASE11_LOAD_RESULTS_JSON is not set; real 10K staging result metrics were not supplied');
    return null;
  }

  const absolutePath = path.isAbsolute(relativePath) ? relativePath : path.join(ROOT_DIR, relativePath);
  if (!existsSync(absolutePath)) {
    addEnvironmentBlocker(result, 'load-results', `${relativePath} does not exist`);
    return null;
  }

  try {
    return JSON.parse(await readFile(absolutePath, 'utf8'));
  } catch {
    addCodeBlocker(result, 'load-results', `${relativePath} is not valid JSON`);
    return null;
  }
}

function enforceLoadTargets(result, metrics) {
  if (!metrics) return;

  const checks = [
    ['concurrent_users', metrics.concurrent_users, 10000, 'min'],
    ['http_req_duration_p95_ms', metrics.http_req_duration_p95_ms, 200, 'max'],
    ['error_rate', metrics.error_rate, 0.001, 'max'],
    ['ws_connections', metrics.ws_connections, 5000, 'min'],
    ['ws_broadcast_p95_ms', metrics.ws_broadcast_p95_ms, 500, 'max'],
    ['bid_burst_per_10s', metrics.bid_burst_per_10s, 1000, 'min'],
    ['duplicate_bids', metrics.duplicate_bids, 0, 'max'],
    ['lost_bids', metrics.lost_bids, 0, 'max'],
    ['webhook_concurrency', metrics.webhook_concurrency, 100, 'min'],
  ];

  for (const [name, value, target, direction] of checks) {
    if (typeof value !== 'number') {
      addCodeBlocker(result, 'load-targets', `${name} metric is missing from PHASE11_LOAD_RESULTS_JSON`);
      addCheck(result, `load:${name}`, 'fail', 'metric missing');
      continue;
    }
    const passed = direction === 'min' ? value >= target : value <= target;
    addCheck(result, `load:${name}`, passed ? 'pass' : 'fail', `${value} ${direction === 'min' ? '>=' : '<='} ${target}`);
    if (!passed) {
      addCodeBlocker(result, 'load-targets', `${name}=${value} violates target ${target}`);
    }
  }
}

async function generateLoadReport() {
  const result = newResult('Phase 11 Load Test Report');
  await checkRequiredFiles(result, REQUIRED_CANONICAL_REFS, 'load-evidence');
  await checkPackageScripts(result, PHASE11_COMMANDS, 'load-scripts');
  await matrixSummary(result);

  if (commandAvailable('k6')) {
    addCheck(result, 'k6', 'pass', 'k6 is available');
  } else {
    addCheck(result, 'k6', 'environment', 'k6 is not available in this environment');
    addEnvironmentBlocker(result, 'k6', 'k6 must be available on the staging load runner');
  }

  if (process.env.PHASE11_LOAD_ENV_READY !== 'true') {
    addEnvironmentBlocker(result, 'load-env', 'PHASE11_LOAD_ENV_READY=true is required for the staging load environment');
  }
  if (process.env.PHASE11_LOAD_EXTERNALS_MOCKED !== 'true') {
    addExternalBlocker(result, 'load-externals', 'PHASE11_LOAD_EXTERNALS_MOCKED=true must confirm Iyzico, OneSignal, R2, and similar providers are mocked/adapted');
  }

  const metrics = await parseLoadResults(result);
  enforceLoadTargets(result, metrics);
  setStatus(result);

  const markdown = [
    '# Phase 11 Load Test Report',
    '',
    '## Executive Status',
    '',
    `- Status: ${result.status}`,
    '- Workload: auction-weighted mixed launch workload.',
    '- Data: deterministic seed users, sellers, products, auctions, and payment/webhook fixtures.',
    '- Ramp: staged ramp with a 10 minute hold at 10K concurrent users.',
    '- External services: mocks/adapters for Iyzico, OneSignal, R2, and similar providers.',
    `- Generated: ${result.generatedAt}`,
    '',
    '## Scenario Plan',
    '',
    '| id | scenario | target | thresholds |',
    '|---|---|---|---|',
    ...LOAD_SCENARIOS.map((scenario) => `| ${scenario.id} | ${scenario.name} | ${scenario.target} | ${scenario.thresholds} |`),
    '',
    '## Required Evidence Checks',
    '',
    '| check | status | notes |',
    '|---|---|---|',
    ...checkRows(result.checks),
    '',
    '## Blocker Classification',
    '',
    '### code_test_security_load_blockers',
    '',
    ...blockerLines(result.code_test_security_load_blockers),
    '',
    '### environment_blockers',
    '',
    ...blockerLines(result.environment_blockers),
    '',
    '### external_dependency_blockers',
    '',
    ...blockerLines(result.external_dependency_blockers),
  ].join('\n');

  await writeReport(result, FILES.loadMarkdown, FILES.loadJson, markdown);
  return result;
}

async function readReportResult(jsonFile) {
  return readJson(relativeReportPath(jsonFile));
}

function mergeBlockers(results, key) {
  return results.flatMap((result) => (result?.[key] ?? []).map((blocker) => ({ report: result.name, ...blocker })));
}

async function generateIndexReport(results = null) {
  const loadedResults = results ?? [
    await readReportResult(FILES.functionalJson),
    await readReportResult(FILES.securityJson),
    await readReportResult(FILES.loadJson),
  ];

  const result = newResult('Phase 11 Launch Readiness Index');
  const missingReports = [
    [FILES.functionalJson, loadedResults[0]],
    [FILES.securityJson, loadedResults[1]],
    [FILES.loadJson, loadedResults[2]],
  ].filter(([, report]) => !report);

  for (const [file] of missingReports) {
    addCodeBlocker(result, 'launch-readiness-index', `${relativeReportPath(file)} is missing`);
  }

  result.report_statuses = loadedResults.filter(Boolean).map((report) => ({
    report: report.name,
    status: report.status,
    generatedAt: report.generatedAt,
  }));
  result.code_test_security_load_blockers.push(...mergeBlockers(loadedResults, 'code_test_security_load_blockers'));
  result.environment_blockers.push(...mergeBlockers(loadedResults, 'environment_blockers'));
  result.external_dependency_blockers.push(...mergeBlockers(loadedResults, 'external_dependency_blockers'));
  setStatus(result);

  const markdown = [
    '# Phase 11 Launch Readiness Index',
    '',
    '## Executive Status',
    '',
    `- Phase 11 status: ${result.status}`,
    '- Phase 11 passes only when `code_test_security_load_blockers` is empty.',
    '- Environment and external dependency blockers are listed separately and do not hide code/test/security/load blockers.',
    `- Generated: ${result.generatedAt}`,
    '',
    '## Report Statuses',
    '',
    '| report | status | generated |',
    '|---|---|---|',
    ...(result.report_statuses ?? []).map((report) => `| ${report.report} | ${report.status} | ${report.generatedAt} |`),
    '',
    '## Required Artifacts',
    '',
    `- \`${relativeReportPath(FILES.functionalMarkdown)}\``,
    `- \`${relativeReportPath(FILES.securityMarkdown)}\``,
    `- \`${relativeReportPath(FILES.loadMarkdown)}\``,
    `- \`${relativeReportPath(FILES.indexMarkdown)}\``,
    '',
    '## Blocker Classification',
    '',
    '### code_test_security_load_blockers',
    '',
    ...blockerLines(result.code_test_security_load_blockers),
    '',
    '### environment_blockers',
    '',
    ...blockerLines(result.environment_blockers),
    '',
    '### external_dependency_blockers',
    '',
    ...blockerLines(result.external_dependency_blockers),
  ].join('\n');

  await writeReport(result, FILES.indexMarkdown, FILES.indexJson, markdown);
  return result;
}

async function main() {
  const runAll = ARGS.has('--all') || ARGS.size === 0;
  const results = [];

  if (runAll || ARGS.has('--functional')) {
    results.push(await generateFunctionalReport());
  }
  if (runAll || ARGS.has('--security')) {
    results.push(await generateSecurityReport());
  }
  if (runAll || ARGS.has('--load')) {
    results.push(await generateLoadReport());
  }
  if (runAll || ARGS.has('--index')) {
    const index = await generateIndexReport(runAll ? results : null);
    if (index.code_test_security_load_blockers.length > 0) {
      process.exitCode = 1;
    }
    return;
  }

  if (results.some((result) => result.code_test_security_load_blockers.length > 0)) {
    process.exitCode = 1;
  }
}

await main();
