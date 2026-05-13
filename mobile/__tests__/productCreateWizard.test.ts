import assert from 'node:assert/strict';
import test from 'node:test';
import { canContinueProductCreateStep, createInitialProductCreateState } from '../hooks/useProductCreateWizard.ts';

test('wizard step one validates merged core fields', () => {
  const initialState = createInitialProductCreateState();
  assert.equal(canContinueProductCreateStep(1, initialState, 0), false);

  const missingDescription = {
    ...initialState,
    title: 'Kilim',
    categoryId: 'cat-1',
    directSalePrice: '150',
  };
  assert.equal(canContinueProductCreateStep(1, missingDescription, 0), false);

  const completeCore = {
    ...missingDescription,
    description: 'El dokuması kilim.',
    stockQuantity: '3',
  };

  assert.equal(canContinueProductCreateStep(1, completeCore, 0), true);
});

test('wizard keeps geo/additional/logistics optional and validates image step', () => {
  const initialState = createInitialProductCreateState();
  assert.equal(canContinueProductCreateStep(2, initialState, 0), true);
  assert.equal(canContinueProductCreateStep(3, initialState, 0), true);
  assert.equal(canContinueProductCreateStep(4, initialState, 0), true);
  assert.equal(canContinueProductCreateStep(5, initialState, 0), false);
  assert.equal(canContinueProductCreateStep(5, initialState, 1), true);
});
