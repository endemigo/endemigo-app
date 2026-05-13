import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialProductCreateState } from '../hooks/useProductCreateWizard.ts';
import { buildProductCreatePayload } from '../utils/productCreateMapper.ts';

test('mobile product-create payload keeps originCountry ISO and salesMonths array contract', () => {
  const state = createInitialProductCreateState();
  state.title = 'Kontrat Test Ürün';
  state.categoryId = 'category-1';
  state.description = 'Kontrat test açıklaması';
  state.directSalePrice = '1.000';
  state.salesMonths = [1, 6, 12];

  const payload = buildProductCreatePayload(state);

  assert.equal(payload.originCountry, 'TR');
  assert.deepEqual(payload.salesMonths, [1, 6, 12]);
  assert.equal(typeof payload.price, 'number');
});
