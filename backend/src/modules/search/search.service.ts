import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, MoreThan, LessThan } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { Auction } from '../auction/entities/auction.entity';
import { Favorite } from './entities/favorite.entity';
import { SearchProductsDto, SearchAuctionsDto } from './dto/search.dto';
import { ProductStatus } from '../../shared/types/product-status.enum';
import { RC } from '../../shared/constants/response-codes';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Auction)
    private readonly auctionRepo: Repository<Auction>,
    @InjectRepository(Favorite)
    private readonly favoriteRepo: Repository<Favorite>,
  ) {}

  // CR-01: Escape ILIKE metacharacters to prevent wildcard injection / DoS
  private escapeLike(value: string): string {
    return value.replace(/[%_\\]/g, '\\$&');
  }

  // ==========================================
  // Product Search
  // ==========================================

  async searchProducts(dto: SearchProductsDto, userId?: string) {
    const page = dto.page || 1;
    const limit = Math.min(dto.limit || 20, 50);

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.seller', 'seller')
      .leftJoinAndSelect('p.images', 'images')
      .where('p.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('p.deletedAt IS NULL');

    // Text search — CR-01: escape ILIKE metacharacters
    if (dto.q) {
      const escaped = this.escapeLike(dto.q);
      qb.andWhere('(p.title ILIKE :q OR p.description ILIKE :q)', { q: `%${escaped}%` });
    }

    // Filters
    if (dto.categoryId) qb.andWhere('p.categoryId = :categoryId', { categoryId: dto.categoryId });
    if (dto.minPrice) qb.andWhere('p.price >= :minPrice', { minPrice: dto.minPrice });
    if (dto.maxPrice) qb.andWhere('p.price <= :maxPrice', { maxPrice: dto.maxPrice });
    if (dto.condition) qb.andWhere('p.condition = :condition', { condition: dto.condition });
    if (dto.listingType) qb.andWhere('p.listingType = :listingType', { listingType: dto.listingType });
    if (dto.originCountry) qb.andWhere('p.originCountry = :originCountry', { originCountry: dto.originCountry });
    if (dto.inStock) qb.andWhere('p.stockQuantity > 0');

    // Sort
    switch (dto.sort) {
      case 'price_asc': qb.orderBy('p.price', 'ASC'); break;
      case 'price_desc': qb.orderBy('p.price', 'DESC'); break;
      case 'popular': qb.orderBy('p.favoriteCount', 'DESC'); break;
      default: qb.orderBy('p.createdAt', 'DESC');
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Check favorites if user is logged in
    let favoritedIds: Set<string> = new Set();
    if (userId && items.length > 0) {
      const favs = await this.favoriteRepo.find({
        where: items.map((p) => ({ userId, productId: p.id })),
        select: ['productId'],
      });
      favoritedIds = new Set(favs.map((f) => f.productId));
    }

    return {
      items: items.map((p) => ({
        ...this.toProductResponse(p),
        isFavorited: favoritedIds.has(p.id),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // Auction Search
  // ==========================================

  async searchAuctions(dto: SearchAuctionsDto) {
    const page = dto.page || 1;
    const limit = Math.min(dto.limit || 20, 50);
    const now = new Date();

    const qb = this.auctionRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .where('a.deletedAt IS NULL');

    // Text search via product — CR-01: escape ILIKE metacharacters
    if (dto.q) {
      const escaped = this.escapeLike(dto.q);
      qb.andWhere('(product.title ILIKE :q OR product.description ILIKE :q)', { q: `%${escaped}%` });
    }

    // Status filter
    if (dto.status === 'active') {
      qb.andWhere('a.status = :s', { s: 'ACTIVE' })
        .andWhere('a.startTime <= :now', { now })
        .andWhere('a.endTime > :now', { now });
    } else if (dto.status === 'upcoming') {
      qb.andWhere('a.status = :s', { s: 'PUBLISHED' })
        .andWhere('a.startTime > :now', { now });
    } else if (dto.status === 'ended') {
      qb.andWhere('a.status = :s', { s: 'ENDED' });
    }

    // Filters
    if (dto.categoryId) qb.andWhere('product.categoryId = :categoryId', { categoryId: dto.categoryId });
    if (dto.minPrice) qb.andWhere('a.currentPrice >= :minPrice', { minPrice: dto.minPrice });
    if (dto.maxPrice) qb.andWhere('a.currentPrice <= :maxPrice', { maxPrice: dto.maxPrice });

    // Sort
    switch (dto.sort) {
      case 'ending_soon': qb.orderBy('a.endTime', 'ASC'); break;
      case 'price_asc': qb.orderBy('a.currentPrice', 'ASC'); break;
      case 'most_bids': qb.orderBy('a.bidCount', 'DESC'); break;
      default: qb.orderBy('a.createdAt', 'DESC');
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: items.map((a) => ({
        id: a.id,
        productTitle: a.product?.title,
        productImageUrl: a.product?.imageUrl,
        categoryName: a.product?.category?.name || null,
        startPrice: Number(a.startPrice),
        currentPrice: Number(a.currentPrice),
        bidCount: a.bidCount,
        status: a.status,
        startTime: a.startTime,
        endTime: a.endTime,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // Unified Search
  // ==========================================

  async unifiedSearch(q: string, userId?: string) {
    const [products, auctions] = await Promise.all([
      this.searchProducts({ q, limit: 5 }, userId),
      this.searchAuctions({ q, limit: 5 }),
    ]);

    return {
      products: products.items,
      auctions: auctions.items,
      totalProducts: products.total,
      totalAuctions: auctions.total,
    };
  }

  // ==========================================
  // Favorites
  // ==========================================

  async toggleFavorite(userId: string, productId: string) {
    const product = await this.productRepo.findOne({ where: { id: productId } });
    if (!product) throw new NotFoundException({ code: RC.PRODUCT_NOT_FOUND, message: 'Ürün bulunamadı' });

    const existing = await this.favoriteRepo.findOne({ where: { userId, productId } });

    if (existing) {
      await this.favoriteRepo.remove(existing);
      // C5: favoriteCount negatife düşmesini engelle (GREATEST ile 0 floor)
      await this.productRepo
        .createQueryBuilder()
        .update()
        .set({ favoriteCount: () => 'GREATEST("favoriteCount" - 1, 0)' })
        .where('id = :id', { id: productId })
        .execute();
      return { code: 'FAVORITE_REMOVED', message: 'Favorilerden çıkarıldı', isFavorited: false };
    } else {
      const fav = this.favoriteRepo.create({ userId, productId });
      await this.favoriteRepo.save(fav);
      await this.productRepo.increment({ id: productId }, 'favoriteCount', 1);
      return { code: 'FAVORITE_ADDED', message: 'Favorilere eklendi', isFavorited: true };
    }
  }

  async getFavorites(userId: string, page = 1, limit = 20) {
    const [favs, total] = await this.favoriteRepo.findAndCount({
      where: { userId },
      relations: ['product', 'product.category', 'product.images'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: favs
        .filter((f) => f.product)
        .map((f) => ({
          ...this.toProductResponse(f.product),
          isFavorited: true,
          favoritedAt: f.createdAt,
        })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // Response Mapper
  // ==========================================

  private toProductResponse(p: Product) {
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      price: Number(p.price),
      imageUrl: p.imageUrl,
      images: p.images?.map((img) => ({
        id: img.id,
        url: img.url,
        sortOrder: img.sortOrder,
        isPrimary: img.isPrimary,
      })) || [],
      status: p.status,
      sellerId: p.sellerId,
      sellerName: p.seller ? `${p.seller.firstName || ''} ${p.seller.lastName || ''}`.trim() : null,
      categoryId: p.categoryId,
      categoryName: p.category?.name || null,
      stockQuantity: p.stockQuantity,
      condition: p.condition,
      listingType: p.listingType,
      originCountry: p.originCountry,
      favoriteCount: p.favoriteCount,
      createdAt: p.createdAt,
    };
  }
}
