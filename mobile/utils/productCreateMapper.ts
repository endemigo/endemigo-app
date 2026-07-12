import {
  PRODUCT_CREATE_LISTING_TYPES,
  type ProductCreateWizardState,
} from '../types/productCreate.ts';
import { normalizeMoneyScale } from '../../shared-types/utils/money.ts';
import { parsePriceInput } from './priceInputMask.ts';

interface ProductCreatePayload {
  title: string;
  description?: string;
  price?: number;
  retailPrice?: number;
  wholesalePrice?: number;
  categoryId: string;
  stockQuantity: number;
  sku?: string;
  barcodeNo?: string;
  productContent?: string;
  sellerNotes?: string;
  brand?: string;
  isEndemigoBrandCandidate?: boolean;
  geoIndicationCertNo?: string;
  geoIndicationRegion?: string;
  geoIndicationReceivedAt?: string;
  originCountry: string;
  originRegion?: string;
  productionProvince?: string;
  productionDistrict?: string;
  productionSeason?: ProductCreateWizardState['productionSeasons'][number];
  productionSeasons?: ProductCreateWizardState['productionSeasons'];
  salesMonths?: number[];
  shippingProvince?: string;
  shippingDistrict?: string;
  shippingAddress?: string;
  deliveryTemplateDomestic?: string;
  deliveryTemplateInternational?: string;
  desiDomestic?: string;
  desiInternational?: string;
  featureBadges?: string[];
  geoBadgeSelections?: string[];
  additionalCertificates?: string;
  condition: ProductCreateWizardState['condition'];
  listingType: ProductCreateWizardState['listingType'];
  askPriceEnabled?: boolean;
  askPriceMinAmount?: number;
  weight?: number;
  dimensionWidth?: number;
  dimensionHeight?: number;
  dimensionDepth?: number;
  variantSkus?: ProductCreateWizardState['variantSkus'];
}

interface AuctionCreatePayload {
  productId: string;
  startPrice: number;
  minIncrement: number;
  reservePrice?: number;
  // Lot zamanı/kuralları backend'de etkinlikten miras alınır; buradaki
  // değerler yalnızca DTO doğrulaması için etkinlikten kopyalanır.
  startTime: string;
  endTime: string;
  auctionType: ProductCreateWizardState['auctionType'];
  antiSnipingEnabled: boolean;
  extensionSeconds: number;
  maxExtensions: number;
  guaranteeAccepted: boolean;
}

function parseOptionalNumber(value: string): number | undefined {
  return parsePriceInput(value);
}

function resolveStringField(
  key: keyof ProductCreateWizardState,
  state: ProductCreateWizardState,
): string | undefined {
  const directValue = state[key];
  const dynamicValue = state.dynamicFieldValues[String(key)];
  const value = typeof dynamicValue === 'string' ? dynamicValue : directValue;
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export function buildProductCreatePayload(
  state: ProductCreateWizardState,
): ProductCreatePayload {
  const isDirectSale = state.listingType === PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE;
  const priceSource = isDirectSale ? state.directSalePrice : state.auctionStartPrice;
  const priceVal = parsePriceInput(priceSource);
  const parsedPrice = priceVal !== undefined && priceVal > 0 ? normalizeMoneyScale(priceVal) : undefined;
  const parsedRetailPrice = parseOptionalNumber(state.retailPrice);
  const parsedWholesalePrice = parseOptionalNumber(state.wholesalePrice);
  const parsedAskPriceMinAmount = parseOptionalNumber(state.askPriceMinAmount);
  // Fiyatsız direkt satış ürünü otomatik "Fiyat Sor" ilanına dönüşür.
  const effectiveAskPriceEnabled = isDirectSale
    ? state.askPriceEnabled || parsedPrice === undefined
    : false;

  return {
    title: state.title.trim(),
    description: state.description.trim() || undefined,
    price: parsedPrice,
    retailPrice: parsedRetailPrice !== undefined ? normalizeMoneyScale(parsedRetailPrice) : parsedPrice,
    wholesalePrice: parsedWholesalePrice !== undefined ? normalizeMoneyScale(parsedWholesalePrice) : undefined,
    categoryId: state.categoryId,
    stockQuantity: Number(state.stockQuantity || '0'),
    sku: resolveStringField('sku', state),
    barcodeNo: resolveStringField('barcodeNo', state),
    productContent: resolveStringField('productContent', state),
    sellerNotes: state.description.trim() || undefined,
    brand: resolveStringField('brand', state),
    isEndemigoBrandCandidate: state.isEndemigoBrandCandidate,
    geoIndicationCertNo: state.geoIndicationCertNo.trim() || undefined,
    geoIndicationRegion: state.geoIndicationRegion.trim() || undefined,
    geoIndicationReceivedAt: state.geoIndicationReceivedAt.trim() || undefined,
    originCountry: state.originCountry.trim() || 'TR',
    originRegion: state.originRegion.trim() || undefined,
    productionProvince: state.productionProvince.trim() || undefined,
    productionDistrict: state.productionDistrict.trim() || undefined,
    productionSeasons: state.productionSeasons,
    productionSeason: state.productionSeasons[0],
    salesMonths: state.salesMonths,
    shippingProvince: state.shippingProvince.trim() || undefined,
    shippingDistrict: state.shippingDistrict.trim() || undefined,
    shippingAddress: state.shippingAddress.trim() || undefined,
    deliveryTemplateDomestic: state.deliveryTemplateDomestic.trim() || undefined,
    deliveryTemplateInternational: state.deliveryTemplateInternational.trim() || undefined,
    desiDomestic: state.desiDomestic.trim() || undefined,
    desiInternational: state.desiInternational.trim() || undefined,
    featureBadges: state.featureBadges.length > 0 ? state.featureBadges : undefined,
    geoBadgeSelections: state.geoBadgeSelections.length > 0 ? state.geoBadgeSelections : undefined,
    additionalCertificates: state.additionalCertificates.trim() || undefined,
    condition: state.condition,
    listingType: state.listingType,
    askPriceEnabled: effectiveAskPriceEnabled,
    askPriceMinAmount: effectiveAskPriceEnabled
      ? (parsedAskPriceMinAmount !== undefined ? normalizeMoneyScale(parsedAskPriceMinAmount) : undefined)
      : undefined,
    weight: parseOptionalNumber(state.weight),
    dimensionWidth: parseOptionalNumber(state.dimensionWidth),
    dimensionHeight: parseOptionalNumber(state.dimensionHeight),
    dimensionDepth: parseOptionalNumber(state.dimensionDepth),
    variantSkus: state.variantSkus.length > 0 ? state.variantSkus : undefined,
  };
}

export function buildAuctionCreatePayload(
  productId: string,
  state: ProductCreateWizardState,
): AuctionCreatePayload {
  return {
    productId,
    startPrice: normalizeMoneyScale(parsePriceInput(state.auctionStartPrice) ?? 0),
    minIncrement: normalizeMoneyScale(parsePriceInput(state.auctionMinIncrement) ?? 0),
    reservePrice: (() => {
      const parsedReservePrice = parsePriceInput(state.auctionReservePrice);
      return parsedReservePrice !== undefined
        ? normalizeMoneyScale(parsedReservePrice)
        : undefined;
    })(),
    startTime: state.auctionStartTime,
    endTime: state.auctionEndTime,
    auctionType: state.auctionType,
    antiSnipingEnabled: state.antiSnipingEnabled,
    extensionSeconds: Number(state.extensionSeconds || '60'),
    maxExtensions: Number(state.maxExtensions || '5'),
    guaranteeAccepted: true,
  };
}
