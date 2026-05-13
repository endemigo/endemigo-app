import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const MOBILE_DIR = process.cwd().endsWith(`${path.sep}mobile`)
  ? process.cwd()
  : path.join(process.cwd(), 'mobile');

function read(relativePath: string) {
  return readFileSync(path.join(MOBILE_DIR, relativePath), 'utf8');
}

test('auction detail premium screen exposes premium presentation building blocks', () => {
  const screenSource = read('app/auction/[id].tsx');
  const trSource = read('i18n/tr.json');
  const enSource = read('i18n/en.json');

  assert.ok(existsSync(path.join(MOBILE_DIR, 'components/auction/AuctionHero.tsx')));
  assert.ok(existsSync(path.join(MOBILE_DIR, 'components/auction/AuctionSummaryPanel.tsx')));
  assert.ok(existsSync(path.join(MOBILE_DIR, 'components/auction/AuctionRulesPanel.tsx')));
  assert.ok(existsSync(path.join(MOBILE_DIR, 'components/auction/AuctionBidHistory.tsx')));

  assert.match(screenSource, /AuctionHero/);
  assert.match(screenSource, /AuctionSummaryPanel/);
  assert.match(screenSource, /AuctionRulesPanel/);
  assert.match(screenSource, /AuctionBidHistory/);
  assert.match(trSource, /premiumTrustTitle/);
  assert.match(enSource, /premiumTrustTitle/);
});
