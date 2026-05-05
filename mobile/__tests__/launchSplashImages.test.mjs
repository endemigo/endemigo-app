import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CURATED_LAUNCH_SPLASH_IMAGE_POOL,
  buildLaunchSplashColumns,
  createLaunchSplashImageItems,
} from '../utils/launchSplashImages.ts';

test('createLaunchSplashImageItems prefers live images and backfills with curated pool', () => {
  const items = createLaunchSplashImageItems({
    storedImages: ['https://cdn.example.com/live-1.jpg', 'https://cdn.example.com/live-1.jpg', '', 'https://cdn.example.com/live-2.jpg'],
    maxImages: 4,
  });

  assert.deepEqual(
    items.map((item) => item.uri),
    [
      'https://cdn.example.com/live-1.jpg',
      'https://cdn.example.com/live-2.jpg',
      CURATED_LAUNCH_SPLASH_IMAGE_POOL[0],
      CURATED_LAUNCH_SPLASH_IMAGE_POOL[1],
    ],
  );
  assert.equal(items[0].source, 'live');
  assert.equal(items[2].source, 'fallback');
});

test('buildLaunchSplashColumns distributes image items across columns', () => {
  const items = createLaunchSplashImageItems({
    storedImages: [
      'https://cdn.example.com/live-1.jpg',
      'https://cdn.example.com/live-2.jpg',
      'https://cdn.example.com/live-3.jpg',
      'https://cdn.example.com/live-4.jpg',
      'https://cdn.example.com/live-5.jpg',
      'https://cdn.example.com/live-6.jpg',
    ],
    maxImages: 6,
  });

  const columns = buildLaunchSplashColumns(items, 3);

  assert.equal(columns.length, 3);
  assert.deepEqual(
    columns.map((column) => column.map((item) => item.uri)),
    [
      ['https://cdn.example.com/live-1.jpg', 'https://cdn.example.com/live-4.jpg'],
      ['https://cdn.example.com/live-5.jpg', 'https://cdn.example.com/live-2.jpg'],
      ['https://cdn.example.com/live-3.jpg', 'https://cdn.example.com/live-6.jpg'],
    ],
  );
});
