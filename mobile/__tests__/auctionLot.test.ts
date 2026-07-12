import assert from 'node:assert/strict';
import test from 'node:test';
import { checkLotPrices } from '../utils/auctionLot.ts';

test('açılış fiyatı 1 altındaysa geçersiz', () => {
  assert.equal(checkLotPrices('0').startValid, false);
  assert.equal(checkLotPrices('').startValid, false);
  assert.equal(checkLotPrices('1').startValid, true);
  assert.equal(checkLotPrices('1.500').startValid, true);
});

test('rezerv açılıştan düşükse işaretlenir', () => {
  const low = checkLotPrices('1.000', '800');
  assert.equal(low.reserveBelowStart, true);
  assert.equal(low.reserveValue, 800);
});

test('rezerv açılışa eşit/üstündeyse geçerli', () => {
  assert.equal(checkLotPrices('1.000', '1.000').reserveBelowStart, false);
  assert.equal(checkLotPrices('1.000', '1.500').reserveBelowStart, false);
});

test('rezerv boşsa kural uygulanmaz', () => {
  const none = checkLotPrices('1.000', '');
  assert.equal(none.reserveValue, null);
  assert.equal(none.reserveBelowStart, false);
});
