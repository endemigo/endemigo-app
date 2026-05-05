export interface AdminDashboardMetricsDto {
  volume: {
    totalOrders: number;
    grossMerchandiseValue: number;
  };
  auctions: {
    activeCount: number;
    endingSoonCount: number;
  };
  payments: {
    pendingReviewAmount: number;
    failedCount: number;
  };
  userBehavior: {
    newUsers: number;
    newSellers: number;
    activeSellers: number;
  };
  errors: {
    recentCount: number;
  };
}
