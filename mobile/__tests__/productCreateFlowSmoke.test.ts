import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const MOBILE_DIR = process.cwd().endsWith(`${path.sep}mobile`) ? process.cwd() : path.join(process.cwd(), 'mobile');

function read(relativePath: string) {
  return readFileSync(path.join(MOBILE_DIR, relativePath), 'utf8');
}

test('product create wizard source anchors exist', () => {
  const wizardSource = read('components/forms/product-create/ProductCreateWizard.tsx');
  const segmentSource = read('components/forms/product-create/ProductTypeSegment.tsx');
  const serviceSource = read('services/productCreateService.ts');
  const draftServiceSource = read('services/listingDraftService.ts');

  assert.match(wizardSource, /expo-image-picker/);
  assert.match(wizardSource, /ProductCreateProgress/);
  assert.match(segmentSource, /DIRECT_SALE/);
  assert.match(segmentSource, /AUCTION/);
  assert.match(serviceSource, /\/products/);
  assert.match(serviceSource, /\/auctions/);
  assert.match(serviceSource, /\/publish/);
  assert.match(wizardSource, /entryMode/);
  assert.match(wizardSource, /listing\.entryModeMarketplace/);
  assert.match(draftServiceSource, /\/products\/drafts/);
});
