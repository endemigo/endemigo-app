import assert from 'node:assert/strict';
import test from 'node:test';
import { formatPriceInput, parsePriceInput } from '../utils/priceInputMask.ts';

test('formatPriceInput formats integer with Turkish thousand separator', () => {
  assert.equal(formatPriceInput('1000'), '1.000');
  assert.equal(formatPriceInput('1234567'), '1.234.567');
});

test('formatPriceInput supports comma decimals with max 2 digits', () => {
  assert.equal(formatPriceInput('1233,50'), '1.233,50');
  assert.equal(formatPriceInput('1233,5'), '1.233,5');
  assert.equal(formatPriceInput('1233,509'), '1.233,50');
});

test('formatPriceInput does not create decimal part unless comma is entered', () => {
  assert.equal(formatPriceInput('22.22'), '2.222');
  assert.equal(formatPriceInput('1000'), '1.000');
});

test('parsePriceInput parses Turkish masked values', () => {
  assert.equal(parsePriceInput('1.233,50'), 1233.5);
  assert.equal(parsePriceInput('1.000'), 1000);
  assert.equal(parsePriceInput('22.22'), 2222);
  assert.equal(parsePriceInput(''), undefined);
});
