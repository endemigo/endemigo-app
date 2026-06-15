import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateAuctionBidEstimate } from '../utils/auctionBidConsole.ts';

test('calculateAuctionBidEstimate includes buyer premium in live total', () => {
  const estimate = calculateAuctionBidEstimate({
    bidAmount: 1000,
    buyerPremiumRate: 0.25,
    walletAvailable: 1500,
  });

  assert.equal(estimate.hammerAmount, 1000);
  assert.equal(estimate.buyerPremiumAmount, 0);
  assert.equal(estimate.estimatedTotal, 1000);
  assert.equal(estimate.isWalletSufficient, true);
  assert.equal(estimate.walletShortfall, 0);
});

test('calculateAuctionBidEstimate closes bid gate when wallet cannot cover total', () => {
  const estimate = calculateAuctionBidEstimate({
    bidAmount: 1000,
    buyerPremiumRate: 0.25,
    walletAvailable: 800,
  });

  assert.equal(estimate.estimatedTotal, 1000);
  assert.equal(estimate.isWalletSufficient, false);
  assert.equal(estimate.walletShortfall, 200);
});
