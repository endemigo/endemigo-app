export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  phone?: string;
  isSeller?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

export interface Product {
  id: string;
  categoryId: string;
  categoryName: string;
  title: string;
  sellerName: string;
  price: number;
  oldPrice?: number;
  thumbnail?: string | any;
  images?: string[];
  description?: string;
  isAuction?: boolean;
}

export interface Bid {
  id: string;
  bidderName: string;
  amount: number;
  isAutoBid: boolean;
  time: string;
}

export interface Blog {
  id: string | number;
  title: string;
  category: string;
  excerpt: string;
  readTime: string;
  date?: string;
  image?: any;
}
