#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = path.resolve(new URL('..', import.meta.url).pathname);
const REPORT_DIR = path.join(ROOT_DIR, '.planning/reports/phase10');
const MARKDOWN_REPORT = path.join(REPORT_DIR, 'contract-drift.md');
const JSON_REPORT = path.join(REPORT_DIR, 'contract-drift.json');
const COMMAND = 'npm --prefix backend run phase10:contract';

const checks = [];
const blockers = [];

function addCheck(section, name, status, notes = '') {
  checks.push({ section, name, status, notes });
  if (status === 'fail') {
    blockers.push({ category: 'code_contract_drift', section, name, notes });
  }
  if (status === 'environment') {
    blockers.push({ category: 'environment', section, name, notes });
  }
}

async function readProjectFile(relativePath) {
  return readFile(path.join(ROOT_DIR, relativePath), 'utf8');
}

function extractResponseCodeKeys(source) {
  const keys = new Set();
  for (const match of source.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):\s*['"`]\1['"`]/gm)) {
    keys.add(match[1]);
  }
  return keys;
}

async function checkSharedResponseCodes() {
  const sharedSource = await readProjectFile('shared-types/constants/response-codes.ts');
  const backendSource = await readProjectFile('backend/src/shared/constants/response-codes.ts');
  const responseCodes = extractResponseCodeKeys(sharedSource);

  addCheck(
    'Response Codes',
    'shared-types exports RC',
    /export\s+const\s+RC\s*=/.test(sharedSource) ? 'pass' : 'fail',
    'shared-types/constants/response-codes.ts must export RC',
  );
  addCheck(
    'Response Codes',
    'shared-types exports ResponseCode',
    /export\s+type\s+ResponseCode\s*=/.test(sharedSource) ? 'pass' : 'fail',
    'shared-types/constants/response-codes.ts must export ResponseCode',
  );
  addCheck(
    'Response Codes',
    'backend re-exports from @endemigo/shared',
    /from\s+['"]@endemigo\/shared['"]/.test(backendSource) && /RC/.test(backendSource) && /ResponseCode/.test(backendSource)
      ? 'pass'
      : 'fail',
    'backend/src/shared/constants/response-codes.ts must be a shared-types re-export bridge',
  );

  const filesToScan = ['backend/src', 'backend/test'];
  const rcReferences = await collectFiles(filesToScan, (file) => file.endsWith('.ts'));
  const unresolved = [];
  for (const file of rcReferences) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/\bRC\.([A-Z][A-Z0-9_]+)\b/g)) {
      if (!responseCodes.has(match[1])) {
        unresolved.push({ file: path.relative(ROOT_DIR, file), code: match[1] });
      }
    }
  }

  addCheck(
    'Response Codes',
    'backend RC references resolve',
    unresolved.length === 0 ? 'pass' : 'fail',
    unresolved.length === 0 ? `${responseCodes.size} shared codes available` : JSON.stringify(unresolved),
  );

  return { responseCodeCount: responseCodes.size, unresolved };
}

async function checkSharedEnums() {
  const enumDir = path.join(ROOT_DIR, 'shared-types/enums');
  const indexSource = await readProjectFile('shared-types/enums/index.ts');
  const enumFiles = (await readdir(enumDir))
    .filter((file) => file.endsWith('.enum.ts'))
    .sort();
  const missing = enumFiles.filter((file) => !indexSource.includes(`'./${file.replace(/\.ts$/, '')}'`));

  addCheck(
    'Shared Enums',
    'all shared enum files exported by index',
    missing.length === 0 ? 'pass' : 'fail',
    missing.length === 0 ? `${enumFiles.length} enum files exported` : `Missing exports: ${missing.join(', ')}`,
  );

  return { enumFiles, missing };
}

async function collectFiles(relativeDirs, predicate) {
  const output = [];
  async function walk(currentPath) {
    let entries;
    try {
      entries = await readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath);
      } else if (predicate(entryPath)) {
        output.push(entryPath);
      }
    }
  }
  for (const relativeDir of relativeDirs) {
    await walk(path.join(ROOT_DIR, relativeDir));
  }
  return output.sort();
}

async function checkOpenApi() {
  const mainSource = await readProjectFile('backend/src/main.ts');
  const hasSwagger = /SwaggerModule\.createDocument/.test(mainSource) && /SwaggerModule\.setup\(['"]api\/docs/.test(mainSource);
  addCheck(
    'OpenAPI',
    'Swagger document configured',
    hasSwagger ? 'pass' : 'fail',
    'backend/src/main.ts should configure Swagger/OpenAPI output',
  );

  const openApiUrl = process.env.PHASE10_OPENAPI_URL || 'http://localhost:3000/api/docs-json';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(openApiUrl, { signal: controller.signal });
    if (!response.ok) {
      addCheck('OpenAPI', 'live OpenAPI fetch', 'environment', `${openApiUrl} returned HTTP ${response.status}`);
      return { openApiUrl, available: false, reason: `HTTP ${response.status}` };
    }
    const document = await response.json();
    const paths = Object.keys(document.paths ?? {});
    addCheck('OpenAPI', 'live OpenAPI fetch', paths.length > 0 ? 'pass' : 'fail', `${paths.length} paths returned from ${openApiUrl}`);
    return { openApiUrl, available: paths.length > 0, pathCount: paths.length };
  } catch (error) {
    addCheck('OpenAPI', 'live OpenAPI fetch', 'environment', `${openApiUrl} unavailable: ${error.message}`);
    return { openApiUrl, available: false, reason: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

function toMarkdown(result) {
  const lines = [
    '# Phase 10 Contract Drift Report',
    '',
    `- Command: \`${COMMAND}\``,
    `- Generated: ${result.generatedAt}`,
    `- Exit code: ${result.exitCode}`,
    '',
    '## OpenAPI',
    '',
    ...sectionRows('OpenAPI'),
    '',
    '## Shared Enums',
    '',
    ...sectionRows('Shared Enums'),
    '',
    '## Response Codes',
    '',
    ...sectionRows('Response Codes'),
    '',
    '## Blockers',
    '',
  ];

  if (result.blocking.length === 0 && result.environment.length === 0) {
    lines.push('None.');
  } else {
    for (const blocker of result.blocking) {
      lines.push(`- BLOCKING_CONTRACT_DRIFT: ${blocker.section} / ${blocker.name} — ${blocker.notes}`);
    }
    for (const blocker of result.environment) {
      lines.push(`- ENVIRONMENT_BLOCKER: ${blocker.section} / ${blocker.name} — ${blocker.notes}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function sectionRows(section) {
  const rows = checks
    .filter((check) => check.section === section)
    .map((check) => `- ${check.status.toUpperCase()}: ${check.name} — ${check.notes}`);
  return rows.length > 0 ? rows : ['- No checks recorded.'];
}

await mkdir(REPORT_DIR, { recursive: true });

const [responseCodes, enums, openApi] = await Promise.all([
  checkSharedResponseCodes(),
  checkSharedEnums(),
  checkOpenApi(),
]);

const blocking = blockers.filter((blocker) => blocker.category !== 'environment');
const environment = blockers.filter((blocker) => blocker.category === 'environment');
const result = {
  command: COMMAND,
  generatedAt: new Date().toISOString(),
  exitCode: blocking.length > 0 ? 1 : 0,
  checks,
  blocking,
  environment,
  responseCodes,
  enums,
  openApi,
};

await writeFile(JSON_REPORT, `${JSON.stringify(result, null, 2)}\n`);
await writeFile(MARKDOWN_REPORT, toMarkdown(result));

if (blocking.length > 0) {
  process.exitCode = 1;
}
