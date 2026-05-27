export interface AuctionBidEstimateInput {
  bidAmount: number;
  buyerPremiumRate: number;
  walletAvailable?: number | null;
}

export interface AuctionBidFeeEstimate {
  hammerAmount: number;
  buyerPremiumAmount: number;
  estimatedTotal: number;
  isWalletSufficient: boolean;
  walletShortfall: number;
}

function normalizeNonNegativeAmount(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

export function calculateAuctionBidEstimate({
  bidAmount,
  buyerPremiumRate,
  walletAvailable,
}: AuctionBidEstimateInput): AuctionBidFeeEstimate {
  const hammerAmount = normalizeNonNegativeAmount(bidAmount);
  const premiumRate = normalizeNonNegativeAmount(buyerPremiumRate);
  const buyerPremiumAmount = hammerAmount * premiumRate;
  const estimatedTotal = hammerAmount + buyerPremiumAmount;
  const availableAmount =
    typeof walletAvailable === 'number' && Number.isFinite(walletAvailable)
      ? walletAvailable
      : null;
  const walletShortfall =
    availableAmount === null ? 0 : Math.max(0, estimatedTotal - availableAmount);

  return {
    hammerAmount,
    buyerPremiumAmount,
    estimatedTotal,
    isWalletSufficient: availableAmount === null || walletShortfall === 0,
    walletShortfall,
  };
}
