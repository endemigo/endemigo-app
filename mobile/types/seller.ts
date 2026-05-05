export interface SellerProfile {
  id: string;
  name: string;
  avatar?: string;
  banner?: string;
  rating: number;
  reviewCount: number;
  productCount: number;
  totalSales: number;
  description?: string;
  location?: string;
  since?: string;
  trustBadges: string[];
}
