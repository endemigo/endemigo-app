import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const MOBILE_DIR = path.join(process.cwd(), 'mobile');

test('launch splash stays visible for 5 seconds', () => {
  const layoutSource = readFileSync(path.join(MOBILE_DIR, 'app/_layout.tsx'), 'utf8');

  assert.match(layoutSource, /setTimeout\(\(\) => \{\s*setShowLaunchSplash\(false\);\s*\}, 5000\)/);
});

test('floating cart stays hidden while launch splash is visible', () => {
  const layoutSource = readFileSync(path.join(MOBILE_DIR, 'app/_layout.tsx'), 'utf8');

  assert.match(layoutSource, /const shouldShowFloatingCart = !showLaunchSplash && cartCount > 0 && isShoppingRoute && !isCartRoute;/);
});
