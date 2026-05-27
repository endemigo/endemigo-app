import assert from 'node:assert/strict';
import test from 'node:test';
import { canContinueProductCreateStep, createInitialProductCreateState } from '../hooks/useProductCreateWizard.ts';

test('wizard step one validates category selection', () => {
  const initialState = createInitialProductCreateState();
  assert.equal(canContinueProductCreateStep(1, initialState, 0), false);

  const withCategory = {
    ...initialState,
    categoryId: 'cat-1',
  };
  assert.equal(canContinueProductCreateStep(1, withCategory, 0), true);
});

test('wizard step two validates basics, pricing and details', () => {
  const initialState = createInitialProductCreateState();
  assert.equal(canContinueProductCreateStep(2, initialState, 0), false);

  const completeBasics = {
    ...initialState,
    title: 'El Dokuması Kilim',
    categoryId: 'cat-1',
    directSalePrice: '150',
    description: 'El dokuması harika kilim.',
    stockQuantity: '3',
  };

  assert.equal(canContinueProductCreateStep(2, completeBasics, 0), true);
});

test('wizard keeps steps 3, 4, 5 optional and validates image step 6', () => {
  const initialState = createInitialProductCreateState();
  assert.equal(canContinueProductCreateStep(3, initialState, 0), true);
  assert.equal(canContinueProductCreateStep(4, initialState, 0), true);
  assert.equal(canContinueProductCreateStep(5, initialState, 0), true);
  assert.equal(canContinueProductCreateStep(6, initialState, 0), false);
  assert.equal(canContinueProductCreateStep(6, initialState, 1), true);
});

