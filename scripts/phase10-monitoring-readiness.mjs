#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = path.resolve(new URL('..', import.meta.url).pathname);
const REPORT_DIR = path.join(ROOT_DIR, '.planning/reports/phase10');
const MARKDOWN_REPORT = path.join(REPORT_DIR, 'monitoring-readiness.md');
const JSON_REPORT = path.join(REPORT_DIR, 'monitoring-readiness.json');

const FILES = {
  workflow: '.github/workflows/phase10-release-gates.yml',
  backend: 'backend/src/common/monitoring/monitoring.config.ts',
  admin: 'admin/src/services/monitoring.ts',
  mobile: 'mobile/lib/monitoring.ts',
  runbook: 'docs/ota-rollback-runbook.md',
};

const REQUIRED_WORKFLOW_PATTERNS = [
  ['staging environment', /environment:\s*staging/],
  ['production environment', /environment:\s*production/],
  ['workflow_dispatch trigger', /workflow_dispatch:/],
  ['pull_request trigger', /pull_request:/],
  ['backend gate', /phase10:backend-gate/],
  ['admin gate', /phase10:admin-gate/],
  ['mobile gate', /phase10:mobile-gate/],
  ['contract gate', /phase10:contracts/],
  ['ota config gate', /ota:config:check/],
  ['artifact upload', /upload-artifact/],
  ['staging sentry secret refs', /STAGING_SENTRY_DSN|STAGING_VITE_SENTRY_DSN|STAGING_EXPO_PUBLIC_SENTRY_DSN/],
  ['production sentry secret refs', /PRODUCTION_SENTRY_DSN|PRODUCTION_VITE_SENTRY_DSN|PRODUCTION_EXPO_PUBLIC_SENTRY_DSN/],
];

const REQUIRED_CONFIG_PATTERNS = {
  backend: [
    ['SENTRY_DSN', /SENTRY_DSN/],
    ['SENTRY_ENVIRONMENT', /SENTRY_ENVIRONMENT/],
    ['SENTRY_ALERT_WEBHOOK_URL', /SENTRY_ALERT_WEBHOOK_URL/],
  ],
  admin: [
    ['VITE_SENTRY_DSN', /VITE_SENTRY_DSN/],
    ['VITE_SENTRY_ENVIRONMENT', /VITE_SENTRY_ENVIRONMENT/],
  ],
  mobile: [
    ['EXPO_PUBLIC_SENTRY_DSN', /EXPO_PUBLIC_SENTRY_DSN/],
    ['EXPO_PUBLIC_SENTRY_ENVIRONMENT', /EXPO_PUBLIC_SENTRY_ENVIRONMENT/],
  ],
};

const EXTERNAL_ENV_VARS = [
  'SENTRY_DSN',
  'SENTRY_ALERT_WEBHOOK_URL',
  'VITE_SENTRY_DSN',
  'EXPO_PUBLIC_SENTRY_DSN',
  'EAS_TOKEN',
  'IYZICO_API_KEY',
  'ONESIGNAL_REST_API_KEY',
  'CLOUDFLARE_R2_ACCESS_KEY_ID',
];

const checks = [];
const codeTestContractBlockers = [];
const externalDependencyBlockers = [];

async function readProjectFile(relativePath) {
  try {
    return await readFile(path.join(ROOT_DIR, relativePath), 'utf8');
  } catch {
    return null;
  }
}

function recordCheck(id, status, category, notes) {
  checks.push({ id, status, category, notes });
  const blocker = { id, notes };
  if (status !== 'pass' && category === 'code_test_contract_blockers') {
    codeTestContractBlockers.push(blocker);
  }
  if (status !== 'pass' && category === 'external_dependency_blockers') {
    externalDependencyBlockers.push(blocker);
  }
}

function hasHardCodedCredential(source) {
  if (!source) return false;
  const credentialPatterns = [
    /https:\/\/[A-Za-z0-9]+@[A-Za-z0-9.-]+\/[0-9]+/,
    /\bdsn\s*[:=]\s*['"]https?:\/\//i,
    /\b(api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{24,}/i,
  ];
  return credentialPatterns.some((pattern) => pattern.test(source));
}

async function checkConfigFiles() {
  for (const [key, relativePath] of Object.entries(FILES)) {
    const source = await readProjectFile(relativePath);
    recordCheck(
      `${key}:file`,
      source ? 'pass' : 'fail',
      'code_test_contract_blockers',
      source ? `${relativePath} exists` : `${relativePath} is missing`,
    );

    if (!source) continue;

    if (hasHardCodedCredential(source)) {
      recordCheck(`${key}:hard-coded-credential`, 'fail', 'code_test_contract_blockers', `${relativePath} appears to contain a hard-coded credential`);
    } else {
      recordCheck(`${key}:hard-coded-credential`, 'pass', 'code_test_contract_blockers', `${relativePath} does not hard-code credentials`);
    }
  }
}

async function checkRequiredEnvNames() {
  for (const [target, patterns] of Object.entries(REQUIRED_CONFIG_PATTERNS)) {
    const source = await readProjectFile(FILES[target]);
    for (const [name, pattern] of patterns) {
      recordCheck(
        `${target}:${name}`,
        source && pattern.test(source) ? 'pass' : 'fail',
        'code_test_contract_blockers',
        source && pattern.test(source) ? `${name} is referenced` : `${name} is missing from ${FILES[target]}`,
      );
    }
  }
}

async function checkWorkflow() {
  const workflow = await readProjectFile(FILES.workflow);
  for (const [name, pattern] of REQUIRED_WORKFLOW_PATTERNS) {
    recordCheck(
      `workflow:${name}`,
      workflow && pattern.test(workflow) ? 'pass' : 'fail',
      'code_test_contract_blockers',
      workflow && pattern.test(workflow) ? `${name} present` : `${name} missing from ${FILES.workflow}`,
    );
  }

  if (workflow && /STAGING_/.test(workflow) && /PRODUCTION_/.test(workflow)) {
    recordCheck('workflow:secrets-separated', 'pass', 'code_test_contract_blockers', 'staging and production secret names are separated');
  } else {
    recordCheck('workflow:secrets-separated', 'fail', 'code_test_contract_blockers', 'staging and production secret names must stay separated');
  }
}

function checkExternalCredentialPresence() {
  for (const envName of EXTERNAL_ENV_VARS) {
    recordCheck(
      `external:${envName}`,
      process.env[envName] ? 'pass' : 'external',
      'external_dependency_blockers',
      process.env[envName] ? `${envName} is available in this environment` : `${envName} must be configured outside the repository`,
    );
  }

  recordCheck(
    'external:github-environment-secrets',
    'external',
    'external_dependency_blockers',
    'GitHub staging/production environment secrets must be configured in GitHub; repository code can only reference them',
  );
}

function toMarkdown(result) {
  const lines = [
    '# Phase 10 Monitoring Readiness',
    '',
    `- Generated: ${result.generatedAt}`,
    `- Exit code: ${result.exitCode}`,
    '- Provider baseline: Sentry-compatible DSN plus alert webhook readiness',
    '',
    '## Checks',
    '',
    '| id | status | category | notes |',
    '|---|---|---|---|',
    ...result.checks.map((check) => `| ${check.id} | ${check.status} | ${check.category} | ${check.notes} |`),
    '',
    '## code_test_contract_blockers',
    '',
    ...blockerLines(result.code_test_contract_blockers),
    '',
    '## external_dependency_blockers',
    '',
    ...blockerLines(result.external_dependency_blockers),
    '',
    '## Alert Readiness',
    '',
    '- Backend config references `SENTRY_ALERT_WEBHOOK_URL`.',
    '- Staging and production workflow environments reference separate Sentry DSN and alert secret names.',
    '- Missing real DSN, alert webhook, EAS token, and provider credentials are external blockers.',
  ];

  return `${lines.join('\n')}\n`;
}

function blockerLines(blockers) {
  if (blockers.length === 0) return ['None.'];
  return blockers.map((blocker) => `- ${blocker.id}: ${blocker.notes}`);
}

await mkdir(REPORT_DIR, { recursive: true });
await checkConfigFiles();
await checkRequiredEnvNames();
await checkWorkflow();
checkExternalCredentialPresence();

const result = {
  generatedAt: new Date().toISOString(),
  exitCode: codeTestContractBlockers.length > 0 ? 1 : 0,
  checks,
  code_test_contract_blockers: codeTestContractBlockers,
  external_dependency_blockers: externalDependencyBlockers,
};

await writeFile(JSON_REPORT, `${JSON.stringify(result, null, 2)}\n`);
await writeFile(MARKDOWN_REPORT, toMarkdown(result));

console.log(`Monitoring readiness report written: ${path.relative(ROOT_DIR, MARKDOWN_REPORT)}`);

if (result.exitCode !== 0) {
  process.exitCode = result.exitCode;
}
