import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCT_CREATE_LISTING_TYPES } from '../types/productCreate.ts';
import { canContinueProductCreateStep, createInitialProductCreateState } from '../hooks/useProductCreateWizard.ts';

test('wizard step one requires title and category before continuing', () => {
  const initialState = createInitialProductCreateState();
  assert.equal(canContinueProductCreateStep(1, initialState, 0), false);

  const completeBasics = {
    ...initialState,
    title: 'Kilim',
    categoryId: 'cat-1',
  };

  assert.equal(canContinueProductCreateStep(1, completeBasics, 0), true);
});

test('wizard validates price step differently for direct sale and auction', () => {
  const initialState = createInitialProductCreateState();

  assert.equal(
    canContinueProductCreateStep(2, { ...initialState, directSalePrice: '150' }, 0),
    true,
  );

  assert.equal(
    canContinueProductCreateStep(
      2,
      { ...initialState, listingType: PRODUCT_CREATE_LISTING_TYPES.AUCTION, auctionStartPrice: '0' },
      0,
    ),
    false,
  );

  assert.equal(
    canContinueProductCreateStep(
      2,
      { ...initialState, listingType: PRODUCT_CREATE_LISTING_TYPES.AUCTION, auctionStartPrice: '500' },
      0,
    ),
    true,
  );
});

test('wizard image step requires at least one image', () => {
  const initialState = createInitialProductCreateState();
  assert.equal(canContinueProductCreateStep(4, initialState, 0), false);
  assert.equal(canContinueProductCreateStep(4, initialState, 1), true);
});
