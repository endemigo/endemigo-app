import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildLotUpdatePayload,
  buildProductUpdatePayload,
} from '../utils/productEditMapper.ts';

test('buildProductUpdatePayload trims text and scales price', () => {
  const payload = buildProductUpdatePayload({
    title: '  Zeytinyağı  ',
    description: '  Soğuk sıkım  ',
    price: '120',
  });
  assert.equal(payload.title, 'Zeytinyağı');
  assert.equal(payload.description, 'Soğuk sıkım');
  assert.equal(payload.price, 120);
});

test('buildProductUpdatePayload omits empty optional fields', () => {
  const payload = buildProductUpdatePayload({ title: '', description: '', price: '' });
  assert.equal(payload.title, undefined);
  assert.equal(payload.description, undefined);
  assert.equal(payload.price, undefined);
});

test('buildLotUpdatePayload parses lot prices and keeps reserve as null when cleared', () => {
  const payload = buildLotUpdatePayload({
    startPrice: '500',
    reservePrice: '',
    minIncrement: '10',
  });
  assert.equal(payload.startPrice, 500);
  assert.equal(payload.minIncrement, 10);
  // Rezerv boş → kaldırma niyeti (null), undefined değil.
  assert.equal(payload.reservePrice, null);
});

test('buildLotUpdatePayload keeps a provided reserve price', () => {
  const payload = buildLotUpdatePayload({
    startPrice: '500',
    reservePrice: '750,50',
    minIncrement: '10',
  });
  assert.equal(payload.reservePrice, 750.5);
});

test('buildLotUpdatePayload omits non-positive start/increment', () => {
  const payload = buildLotUpdatePayload({ startPrice: '', reservePrice: '', minIncrement: '' });
  assert.equal('startPrice' in payload, false);
  assert.equal('minIncrement' in payload, false);
  assert.equal(payload.reservePrice, null);
});
