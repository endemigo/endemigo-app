#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const [configPath, ...anchors] = process.argv.slice(2);

if (!configPath) {
  console.error('Usage: phase10-coverage-threshold-check.mjs <config> [anchor...]');
  process.exit(1);
}

const source = await readFile(configPath, 'utf8');
const required = ['branches', 'functions', 'lines', 'statements'];
const missing = [];

for (const key of required) {
  const match = source.match(new RegExp(`${key}\\s*[:=]\\s*(\\d+)`));
  if (!match || Number(match[1]) < 80) {
    missing.push(`${key}>=80`);
  }
}

for (const anchor of anchors) {
  if (!source.includes(anchor)) {
    missing.push(`anchor:${anchor}`);
  }
}

if (missing.length > 0) {
  console.error(`Phase 10 coverage threshold check failed for ${configPath}: ${missing.join(', ')}`);
  process.exit(1);
}

console.log(`Phase 10 coverage thresholds OK for ${configPath}`);

