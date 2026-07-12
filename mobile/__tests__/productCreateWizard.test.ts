import assert from 'node:assert/strict';
import test from 'node:test';
import { canContinueProductCreateStep, createInitialProductCreateState } from '../hooks/useProductCreateWizard.ts';
import { PRODUCT_CREATE_LISTING_TYPES } from '../types/productCreate.ts';

test('wizard step one validates category selection', () => {
  const initialState = createInitialProductCreateState();
  assert.equal(canContinueProductCreateStep(1, initialState, 0), false);

  const withCategory = {
    ...initialState,
    categoryId: 'cat-1',
  };
  assert.equal(canContinueProductCreateStep(1, withCategory, 0), true);
});

test('auction listing requires event selection at step one', () => {
  const auctionState = {
    ...createInitialProductCreateState(),
    listingType: PRODUCT_CREATE_LISTING_TYPES.AUCTION,
    categoryId: 'cat-1',
  };
  // Satıcı tek başına müzayede açamaz; etkinlik seçilmeden ilerlenemez
  assert.equal(canContinueProductCreateStep(1, auctionState, 0), false);

  const withEvent = {
    ...auctionState,
    selectedEventId: 'event-1',
  };
  assert.equal(canContinueProductCreateStep(1, withEvent, 0), true);
});

test('auction review step requires event and positive min increment', () => {
  const base = {
    ...createInitialProductCreateState(),
    listingType: PRODUCT_CREATE_LISTING_TYPES.AUCTION,
    categoryId: 'cat-1',
  };
  assert.equal(canContinueProductCreateStep(7, base, 0), false);

  const withEvent = {
    ...base,
    selectedEventId: 'event-1',
  };
  assert.equal(canContinueProductCreateStep(7, withEvent, 0), true);

  const withZeroIncrement = {
    ...withEvent,
    auctionMinIncrement: '0',
  };
  assert.equal(canContinueProductCreateStep(7, withZeroIncrement, 0), false);
});

test('wizard step two requires title; empty price publishes as ask-price listing', () => {
  const initialState = createInitialProductCreateState();
  assert.equal(canContinueProductCreateStep(2, initialState, 0), false);

  // Fiyat boş bırakılabilir → "Fiyat Sor" ilanı
  const withoutPrice = {
    ...initialState,
    title: 'El Dokuması Kilim',
    categoryId: 'cat-1',
  };
  assert.equal(canContinueProductCreateStep(2, withoutPrice, 0), true);

  // Girilen fiyat pozitif olmalı
  const withZeroPrice = {
    ...withoutPrice,
    directSalePrice: '0',
  };
  assert.equal(canContinueProductCreateStep(2, withZeroPrice, 0), false);

  const withPrice = {
    ...withoutPrice,
    directSalePrice: '150',
  };
  assert.equal(canContinueProductCreateStep(2, withPrice, 0), true);
});

test('wizard keeps steps 3, 4, 5 optional and images optional by default', () => {
  const initialState = createInitialProductCreateState();
  assert.equal(canContinueProductCreateStep(3, initialState, 0), true);
  assert.equal(canContinueProductCreateStep(4, initialState, 0), true);
  assert.equal(canContinueProductCreateStep(5, initialState, 0), true);
  assert.equal(canContinueProductCreateStep(6, initialState, 0), true);
  assert.equal(canContinueProductCreateStep(6, initialState, 0, undefined, 1), false);
  assert.equal(canContinueProductCreateStep(6, initialState, 1, undefined, 1), true);
});

