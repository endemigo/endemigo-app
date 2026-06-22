import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PRODUCT_CREATE_AUCTION_TYPES,
  PRODUCT_CREATE_CONDITIONS,
  PRODUCT_CREATE_LISTING_TYPES,
} from '../types/productCreate.ts';
import { buildAuctionCreatePayload, buildProductCreatePayload } from '../utils/productCreateMapper.ts';

test('buildProductCreatePayload maps direct-sale wizard state to backend payload', () => {
  const payload = buildProductCreatePayload({
    listingType: PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE,
    title: 'Vintage kahve makinesi',
    categoryId: 'cat-1',
    directSalePrice: '1.250,00',
    stockQuantity: '1',
    description: 'Temiz kullanildi ve calisiyor',
    condition: PRODUCT_CREATE_CONDITIONS.GOOD,
    originCountry: 'TR',
    originRegion: 'Izmir',
    askPriceEnabled: true,
    askPriceMinAmount: '1.000,00',
    auctionStartPrice: '',
    auctionMinIncrement: '',
    auctionReservePrice: '',
    auctionStartTime: '',
    auctionEndTime: '',
    auctionType: PRODUCT_CREATE_AUCTION_TYPES.REALTIME,
    antiSnipingEnabled: true,
    extensionSeconds: '60',
    maxExtensions: '5',
    sku: '',
    geoIndicationCertNo: '',
    geoIndicationRegion: '',
    geoIndicationReceivedAt: '',
    barcodeNo: '',
    productContent: '',
    sellerNotes: '',
    brand: '',
    isEndemigoBrandCandidate: false,
    productionProvince: '',
    productionDistrict: '',
    productionSeasons: [],
    salesMonths: [],
    wholesalePrice: '',
    retailPrice: '',
    shippingProvince: '',
    shippingDistrict: '',
    shippingAddress: '',
    deliveryTemplateDomestic: '',
    deliveryTemplateInternational: '',
    desiDomestic: '',
    desiInternational: '',
    featureBadges: [],
    geoBadgeSelections: [],
    additionalCertificates: '',
    weight: '',
    dimensionWidth: '',
    dimensionHeight: '',
    dimensionDepth: '',
    dynamicFieldValues: {
      productContent: 'Arabica cekirdek',
      brand: 'Endemigo',
    },
    variantSkus: [
      {
        colorVariantNumberId: 'color-1',
        sizeVariantNumberId: 'size-1',
        skuCode: 'SKU-1',
        stockQuantity: 4,
      },
    ],
  });

  assert.equal(payload.listingType, PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE);
  assert.equal(payload.price, 1250);
  assert.equal(payload.askPriceEnabled, true);
  assert.equal(payload.askPriceMinAmount, 1000);
  assert.equal(payload.condition, PRODUCT_CREATE_CONDITIONS.GOOD);
  assert.equal(payload.productContent, 'Arabica cekirdek');
  assert.equal(payload.brand, 'Endemigo');
  assert.equal(payload.variantSkus?.[0]?.skuCode, 'SKU-1');
});

test('buildAuctionCreatePayload maps auction wizard state to backend payload', () => {
  const payload = buildAuctionCreatePayload('product-1', {
    listingType: PRODUCT_CREATE_LISTING_TYPES.AUCTION,
    title: 'Muzayede urunu',
    categoryId: 'cat-1',
    directSalePrice: '',
    stockQuantity: '1',
    description: 'Aciklama',
    condition: PRODUCT_CREATE_CONDITIONS.NEW,
    originCountry: 'TR',
    originRegion: '',
    askPriceEnabled: false,
    askPriceMinAmount: '',
    auctionStartPrice: '800,00',
    auctionMinIncrement: '50,25',
    auctionReservePrice: '1.250,00',
    auctionStartTime: '2026-05-06T10:00:00.000Z',
    auctionEndTime: '2026-05-07T10:00:00.000Z',
    auctionType: PRODUCT_CREATE_AUCTION_TYPES.REALTIME,
    antiSnipingEnabled: true,
    extensionSeconds: '60',
    maxExtensions: '5',
    sku: '',
    geoIndicationCertNo: '',
    geoIndicationRegion: '',
    geoIndicationReceivedAt: '',
    barcodeNo: '',
    productContent: '',
    sellerNotes: '',
    brand: '',
    isEndemigoBrandCandidate: false,
    productionProvince: '',
    productionDistrict: '',
    productionSeasons: [],
    salesMonths: [],
    wholesalePrice: '',
    retailPrice: '',
    shippingProvince: '',
    shippingDistrict: '',
    shippingAddress: '',
    deliveryTemplateDomestic: '',
    deliveryTemplateInternational: '',
    desiDomestic: '',
    desiInternational: '',
    featureBadges: [],
    geoBadgeSelections: [],
    additionalCertificates: '',
    weight: '',
    dimensionWidth: '',
    dimensionHeight: '',
    dimensionDepth: '',
    dynamicFieldValues: {},
    variantSkus: [],
  });

  assert.equal(payload.productId, 'product-1');
  assert.equal(payload.startPrice, 800);
  assert.equal(payload.minIncrement, 50.25);
  assert.equal(payload.reservePrice, 1250);
  assert.equal(payload.auctionType, PRODUCT_CREATE_AUCTION_TYPES.REALTIME);
  assert.equal(payload.extensionSeconds, 60);
});

test('buildProductCreatePayload maps direct-sale with askPriceEnabled and empty price', () => {
  const payload = buildProductCreatePayload({
    listingType: PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE,
    title: 'Vintage kahve makinesi',
    categoryId: 'cat-1',
    directSalePrice: '',
    stockQuantity: '1',
    description: 'Temiz kullanildi',
    condition: PRODUCT_CREATE_CONDITIONS.GOOD,
    originCountry: 'TR',
    originRegion: '',
    askPriceEnabled: true,
    askPriceMinAmount: '',
    auctionStartPrice: '',
    auctionMinIncrement: '',
    auctionReservePrice: '',
    auctionStartTime: '',
    auctionEndTime: '',
    auctionType: PRODUCT_CREATE_AUCTION_TYPES.REALTIME,
    antiSnipingEnabled: true,
    extensionSeconds: '60',
    maxExtensions: '5',
    sku: '',
    geoIndicationCertNo: '',
    geoIndicationRegion: '',
    geoIndicationReceivedAt: '',
    barcodeNo: '',
    productContent: '',
    sellerNotes: '',
    brand: '',
    isEndemigoBrandCandidate: false,
    productionProvince: '',
    productionDistrict: '',
    productionSeasons: [],
    salesMonths: [],
    wholesalePrice: '',
    retailPrice: '',
    shippingProvince: '',
    shippingDistrict: '',
    shippingAddress: '',
    deliveryTemplateDomestic: '',
    deliveryTemplateInternational: '',
    desiDomestic: '',
    desiInternational: '',
    featureBadges: [],
    geoBadgeSelections: [],
    additionalCertificates: '',
    weight: '',
    dimensionWidth: '',
    dimensionHeight: '',
    dimensionDepth: '',
    dynamicFieldValues: {},
    variantSkus: [],
  });

  assert.equal(payload.listingType, PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE);
  assert.equal(payload.price, undefined);
  assert.equal(payload.askPriceEnabled, true);
});
