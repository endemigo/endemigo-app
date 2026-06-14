import { formatCurrency } from './transactionFormatters';
import { ListingType, type Product } from '../types';

/**
 * Formats a product's price professionally.
 * Displays "Fiyat Sor" (Ask Price) if askPriceEnabled is true or if price is 0/null.
 * Displays "Müzayede" (Auction) if it is an auction listing.
 */
export function formatProductPrice(product: Product, t: (key: string) => string): string {
  if (product.askPriceEnabled) {
    return t('product.askPrice');
  }

  if (product.listingType === ListingType.AUCTION) {
    return t('listing.auction');
  }

  const price = Number(product.price);
  if (isNaN(price) || price <= 0) {
    return t('product.askPrice');
  }

  return formatCurrency(price);
}
