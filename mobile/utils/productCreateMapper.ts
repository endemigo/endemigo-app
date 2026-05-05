import {
  PRODUCT_CREATE_LISTING_TYPES,
  type ProductCreateWizardState,
} from '../types/productCreate.ts';

interface ProductCreatePayload {
  title: string;
  description?: string;
  price: number;
  categoryId: string;
  stockQuantity: number;
  sku?: string;
  geoIndicationCertNo?: string;
  geoIndicationRegion?: string;
  originCountry: string;
  originRegion?: string;
  condition: ProductCreateWizardState['condition'];
  listingType: ProductCreateWizardState['listingType'];
  askPriceEnabled?: boolean;
  askPriceMinAmount?: number;
  weight?: number;
  dimensionWidth?: number;
  dimensionHeight?: number;
  dimensionDepth?: number;
}

interface AuctionCreatePayload {
  productId: string;
  startPrice: number;
  minIncrement: number;
  startTime: string;
  endTime: string;
  auctionType: ProductCreateWizardState['auctionType'];
  antiSnipingEnabled: boolean;
  extensionSeconds: number;
  maxExtensions: number;
}

function parseOptionalNumber(value: string): number | undefined {
  const normalizedValue = value.replace(',', '.').trim();
  if (!normalizedValue) return undefined;

  const parsed = Number(normalizedValue);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function buildProductCreatePayload(
  state: ProductCreateWizardState,
): ProductCreatePayload {
  const priceSource = state.listingType === PRODUCT_CREATE_LISTING_TYPES.AUCTION
    ? state.auctionStartPrice
    : state.directSalePrice;

  return {
    title: state.title.trim(),
    description: state.description.trim() || undefined,
    price: Number(priceSource.replace(',', '.')),
    categoryId: state.categoryId,
    stockQuantity: Number(state.stockQuantity || '0'),
    sku: state.sku.trim() || undefined,
    geoIndicationCertNo: state.geoIndicationCertNo.trim() || undefined,
    geoIndicationRegion: state.geoIndicationRegion.trim() || undefined,
    originCountry: state.originCountry.trim() || 'TR',
    originRegion: state.originRegion.trim() || undefined,
    condition: state.condition,
    listingType: state.listingType,
    askPriceEnabled: state.listingType === PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE ? state.askPriceEnabled : false,
    askPriceMinAmount: state.listingType === PRODUCT_CREATE_LISTING_TYPES.DIRECT_SALE && state.askPriceEnabled
      ? parseOptionalNumber(state.askPriceMinAmount)
      : undefined,
    weight: parseOptionalNumber(state.weight),
    dimensionWidth: parseOptionalNumber(state.dimensionWidth),
    dimensionHeight: parseOptionalNumber(state.dimensionHeight),
    dimensionDepth: parseOptionalNumber(state.dimensionDepth),
  };
}

export function buildAuctionCreatePayload(
  productId: string,
  state: ProductCreateWizardState,
): AuctionCreatePayload {
  return {
    productId,
    startPrice: Number(state.auctionStartPrice.replace(',', '.')),
    minIncrement: Number(state.auctionMinIncrement.replace(',', '.')),
    startTime: state.auctionStartTime,
    endTime: state.auctionEndTime,
    auctionType: state.auctionType,
    antiSnipingEnabled: state.antiSnipingEnabled,
    extensionSeconds: Number(state.extensionSeconds || '60'),
    maxExtensions: Number(state.maxExtensions || '5'),
  };
}
