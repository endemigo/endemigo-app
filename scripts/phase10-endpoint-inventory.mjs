#!/usr/bin/env node

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT_DIR = path.resolve(new URL('..', import.meta.url).pathname);
const REPORT_DIR = path.join(ROOT_DIR, '.planning/reports/phase10');
const MARKDOWN_REPORT = path.join(REPORT_DIR, 'endpoint-inventory.md');
const JSON_REPORT = path.join(REPORT_DIR, 'endpoint-inventory.json');
const CONTRACT_JSON = path.join(REPORT_DIR, 'contract-drift.json');
const COMMAND = 'npm --prefix backend run phase10:inventory';
const HTTP_METHODS = ['get', 'post', 'patch', 'put', 'delete'];
const EXTERNAL_ALLOWLIST = new Set(['/blogs']);

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
        if (!['node_modules', 'dist', 'build', 'coverage'].includes(entry.name)) {
          await walk(entryPath);
        }
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

function normalizePath(value) {
  const normalizedDynamic = value
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/:([A-Za-z0-9_]+)/g, ':param')
    .replace(/\/+/g, '/');
  const withoutQuery = normalizedDynamic.split('?')[0];
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
}

function extractLiteralPath(raw) {
  const value = raw.trim();
  const quote = value[0];
  if (!['"', "'", '`'].includes(quote)) return null;
  let index = 1;
  let output = '';
  while (index < value.length) {
    const char = value[index];
    if (char === '\\') {
      output += value.slice(index, index + 2);
      index += 2;
      continue;
    }
    if (char === quote) return output;
    output += char;
    index += 1;
  }
  return null;
}

function findCallArguments(source, objectName) {
  const calls = [];
  for (const method of HTTP_METHODS) {
    const marker = `${objectName}.${method}(`;
    let index = source.indexOf(marker);
    while (index !== -1) {
      const start = index + marker.length;
      const raw = source.slice(start, start + 500);
      const literal = extractLiteralPath(raw);
      if (literal) {
        calls.push({ method: method.toUpperCase(), path: normalizePath(literal) });
      }
      index = source.indexOf(marker, start);
    }
  }
  return calls;
}

async function scanClients() {
  const files = await collectFiles(['mobile', 'admin/src'], (file) => /\.(ts|tsx|js|vue)$/.test(file));
  const rows = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const relative = path.relative(ROOT_DIR, file);
    const client = relative.startsWith('admin/') ? 'admin' : 'mobile';
    for (const call of findCallArguments(source, 'api')) {
      if (client === 'mobile') rows.push({ client, source: relative, ...call });
    }
    for (const call of findCallArguments(source, 'adminApi')) {
      if (client === 'admin') rows.push({ client, source: relative, ...call });
    }
    for (const match of source.matchAll(/io\([^)]*['"`][^'"`]*?(\/[A-Za-z0-9_-]+)['"`]/g)) {
      rows.push({
        client: 'socket',
        source: relative,
        method: 'SOCKET',
        path: normalizePath(match[1]),
      });
    }
  }
  return dedupeRows(rows);
}

function dedupeRows(rows) {
  const seen = new Map();
  for (const row of rows) {
    const key = `${row.client}|${row.method}|${row.path}|${row.source}`;
    seen.set(key, row);
  }
  return [...seen.values()].sort((left, right) => (
    `${left.client}:${left.method}:${left.path}`.localeCompare(`${right.client}:${right.method}:${right.path}`)
  ));
}

function decoratorPathArgs(source, decoratorName) {
  const output = [];
  const regex = new RegExp(`@${decoratorName}\\(([^)]*)\\)`, 'g');
  for (const match of source.matchAll(regex)) {
    output.push(extractLiteralPath(match[1]) ?? '');
  }
  return output;
}

async function scanBackendRoutes() {
  const files = await collectFiles(['backend/src/modules'], (file) => file.endsWith('controller.ts'));
  const routes = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const controllerBases = decoratorPathArgs(source, 'Controller');
    const base = normalizePath(controllerBases[0] ?? '');
    const decoratorRegex = /@(Get|Post|Patch|Put|Delete)\(([^)]*)\)/g;
    for (const match of source.matchAll(decoratorRegex)) {
      const method = match[1].toUpperCase();
      const routePath = extractLiteralPath(match[2]) ?? '';
      routes.push({
        method,
        path: normalizePath(path.posix.join(base, routePath).replace(/\\/g, '/')),
        source: path.relative(ROOT_DIR, file),
      });
    }
  }
  return routes.sort((left, right) => `${left.method} ${left.path}`.localeCompare(`${right.method} ${right.path}`));
}

async function scanBackendSockets() {
  const files = await collectFiles(['backend/src/modules'], (file) => file.endsWith('.gateway.ts'));
  const sockets = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/namespace:\s*['"`]([^'"`]+)['"`]/g)) {
      sockets.push({ method: 'SOCKET', path: normalizePath(match[1]), source: path.relative(ROOT_DIR, file) });
    }
  }
  return sockets;
}

async function loadOpenApiPaths() {
  try {
    const report = JSON.parse(await readFile(CONTRACT_JSON, 'utf8'));
    if (report.openApi?.available && Array.isArray(report.openApi.paths)) {
      return new Set(report.openApi.paths.map(normalizePath));
    }
  } catch {
    return null;
  }
  return null;
}

function pathMatches(clientPath, backendPath) {
  const left = normalizePath(clientPath).split('/');
  const right = normalizePath(backendPath).split('/');
  if (left.length !== right.length) return false;
  return left.every((segment, index) => (
    segment === right[index] || segment === ':param' || right[index] === ':param'
  ));
}

function classify(row, backendRoutes, sockets, openApiPaths) {
  if (row.client === 'socket') {
    const backendMatch = sockets.some((socket) => pathMatches(row.path, socket.path));
    return {
      backend_match: backendMatch,
      openapi_match: 'n/a',
      status: backendMatch ? 'OK' : 'BLOCKING_CONTRACT_DRIFT',
      notes: backendMatch ? 'Socket namespace found in backend gateway' : 'Socket namespace missing in backend gateway',
    };
  }

  const backendMatch = backendRoutes.some((route) => route.method === row.method && pathMatches(row.path, route.path));
  const openapi_match = openApiPaths ? [...openApiPaths].some((apiPath) => pathMatches(row.path, apiPath)) : 'unknown';
  if (backendMatch) {
    return {
      backend_match: true,
      openapi_match,
      status: 'OK',
      notes: openapi_match === 'unknown' ? 'OpenAPI unavailable; backend route matched statically' : 'Matched',
    };
  }
  if (EXTERNAL_ALLOWLIST.has(row.path)) {
    return {
      backend_match: false,
      openapi_match,
      status: 'ENVIRONMENT_EXTERNAL',
      notes: 'Explicitly listed as external/unimplemented content endpoint',
    };
  }
  return {
    backend_match: false,
    openapi_match,
    status: 'BLOCKING_CONTRACT_DRIFT',
    notes: 'Client endpoint has no static backend route match',
  };
}

function tableFor(group, rows) {
  const lines = [
    `### ${group}`,
    '',
    '| client | method | path | backend_match | openapi_match | status | notes |',
    '|---|---|---|---|---|---|---|',
  ];
  const groupRows = rows.filter((row) => row.client === group);
  if (groupRows.length === 0) {
    lines.push('| _none_ |  |  |  |  |  |  |');
  } else {
    for (const row of groupRows) {
      lines.push(`| ${row.client} | ${row.method} | \`${row.path}\` | ${row.backend_match} | ${row.openapi_match} | ${row.status} | ${row.notes} |`);
    }
  }
  return lines;
}

function toMarkdown(result) {
  return [
    '# Phase 10 Endpoint Inventory Report',
    '',
    `- Command: \`${COMMAND}\``,
    `- Generated: ${result.generatedAt}`,
    `- Exit code: ${result.exitCode}`,
    '',
    '## Inventory',
    '',
    ...tableFor('mobile', result.rows),
    '',
    ...tableFor('admin', result.rows),
    '',
    ...tableFor('socket', result.rows),
    '',
    '## Blockers',
    '',
    ...(result.blockers.length === 0
      ? ['None.']
      : result.blockers.map((row) => `- BLOCKING_CONTRACT_DRIFT: ${row.client} ${row.method} ${row.path} — ${row.notes}`)),
    '',
  ].join('\n');
}

await mkdir(REPORT_DIR, { recursive: true });

const [clientRows, backendRoutes, backendSockets, openApiPaths] = await Promise.all([
  scanClients(),
  scanBackendRoutes(),
  scanBackendSockets(),
  loadOpenApiPaths(),
]);

const rows = clientRows.map((row) => ({
  ...row,
  ...classify(row, backendRoutes, backendSockets, openApiPaths),
}));
const blockers = rows.filter((row) => row.status === 'BLOCKING_CONTRACT_DRIFT');
const result = {
  command: COMMAND,
  generatedAt: new Date().toISOString(),
  exitCode: blockers.length > 0 ? 1 : 0,
  rows,
  blockers,
  backendRoutes,
  backendSockets,
  openApiAvailable: Boolean(openApiPaths),
};

await writeFile(JSON_REPORT, `${JSON.stringify(result, null, 2)}\n`);
await writeFile(MARKDOWN_REPORT, `${toMarkdown(result)}\n`);

if (blockers.length > 0) {
  process.exitCode = 1;
}
