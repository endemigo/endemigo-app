import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/entities/product.entity';
import { Auction } from '../auction/entities/auction.entity';
import { Favorite } from './entities/favorite.entity';
import {
  AuctionSearchSort,
  AuctionSearchStatus,
  ProductSearchSort,
  SearchProductsDto,
  SearchAuctionsDto,
} from './dto/search.dto';
import { ProductStatus } from '../../shared/types/product-status.enum';
import { AuctionStatus } from '../../shared/types/auction-status.enum';
import { RC } from '../../shared/constants/response-codes';
import { AdPlacementType } from '@endemigo/shared';
import { AdsService } from '../ads/ads.service';
import { MembershipService } from '../membership/membership.service';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Auction)
    private readonly auctionRepo: Repository<Auction>,
    @InjectRepository(Favorite)
    private readonly favoriteRepo: Repository<Favorite>,
    @Optional()
    private readonly adsService?: AdsService,
    @Optional()
    private readonly membershipService?: MembershipService,
  ) {}

  // CR-01: Escape ILIKE metacharacters to prevent wildcard injection / DoS
  private escapeLike(value: string): string {
    return value.replace(/[%_\\]/g, '\\$&');
  }

  private normalizePagination(page = 1, limit = 20) {
    const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    const safeLimit = Number.isFinite(limit)
      ? Math.min(Math.max(1, Math.floor(limit)), 50)
      : 20;

    return { page: safePage, limit: safeLimit };
  }

  // ==========================================
  // Product Search
  // ==========================================

  async searchProducts(dto: SearchProductsDto, userId?: string) {
    const { page, limit } = this.normalizePagination(dto.page, dto.limit);

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
      qb.andWhere('(p.title ILIKE :q OR p.description ILIKE :q)', {
        q: `%${escaped}%`,
      });
    }

    // Filters
    if (dto.categoryId)
      qb.andWhere('p.categoryId = :categoryId', { categoryId: dto.categoryId });
    if (dto.minPrice)
      qb.andWhere('p.price >= :minPrice', { minPrice: dto.minPrice });
    if (dto.maxPrice)
      qb.andWhere('p.price <= :maxPrice', { maxPrice: dto.maxPrice });
    if (dto.condition)
      qb.andWhere('p.condition = :condition', { condition: dto.condition });
    if (dto.listingType)
      qb.andWhere('p.listingType = :listingType', {
        listingType: dto.listingType,
      });
    if (dto.originCountry)
      qb.andWhere('p.originCountry = :originCountry', {
        originCountry: dto.originCountry,
      });
    if (dto.inStock) qb.andWhere('p.stockQuantity > 0');

    // Sort
    switch (dto.sort) {
      case ProductSearchSort.PRICE_ASC:
        qb.orderBy('p.price', 'ASC');
        break;
      case ProductSearchSort.PRICE_DESC:
        qb.orderBy('p.price', 'DESC');
        break;
      case ProductSearchSort.POPULAR:
        qb.orderBy('p.favoriteCount', 'DESC');
        break;
      default:
        qb.orderBy('p.createdAt', 'DESC');
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

    const organicItems = items.map((p) => ({
      ...this.toProductResponse(p),
      isFavorited: favoritedIds.has(p.id),
    }));

    const sponsoredItems = await this.annotateSponsoredProducts(
      organicItems,
      AdPlacementType.SEARCH_PROMOTION,
      dto.categoryId,
    );

    return {
      items: await this.applyMembershipVisibilityBoost(sponsoredItems),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // Auction Search
  // ==========================================

  async searchAuctions(dto: SearchAuctionsDto) {
    const { page, limit } = this.normalizePagination(dto.page, dto.limit);
    const now = new Date();
    const publicStatuses = [
      AuctionStatus.PUBLISHED,
      AuctionStatus.ACTIVE,
      AuctionStatus.ENDED,
    ];

    const qb = this.auctionRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .where('a.deletedAt IS NULL');

    // Text search via product — CR-01: escape ILIKE metacharacters
    if (dto.q) {
      const escaped = this.escapeLike(dto.q);
      qb.andWhere('(product.title ILIKE :q OR product.description ILIKE :q)', {
        q: `%${escaped}%`,
      });
    }

    // Status filter
    if (dto.status === AuctionSearchStatus.ACTIVE) {
      qb.andWhere('a.status = :status', { status: AuctionStatus.ACTIVE })
        .andWhere('a.startTime <= :now', { now })
        .andWhere('a.endTime > :now', { now });
    } else if (dto.status === AuctionSearchStatus.UPCOMING) {
      qb.andWhere('a.status = :status', {
        status: AuctionStatus.PUBLISHED,
      }).andWhere('a.startTime > :now', { now });
    } else if (dto.status === AuctionSearchStatus.ENDED) {
      qb.andWhere('a.status = :status', { status: AuctionStatus.ENDED });
    } else {
      qb.andWhere('a.status IN (:...statuses)', { statuses: publicStatuses });
    }

    // Filters
    if (dto.categoryId)
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: dto.categoryId,
      });
    if (dto.minPrice)
      qb.andWhere('a.currentPrice >= :minPrice', { minPrice: dto.minPrice });
    if (dto.maxPrice)
      qb.andWhere('a.currentPrice <= :maxPrice', { maxPrice: dto.maxPrice });

    // Sort
    switch (dto.sort) {
      case AuctionSearchSort.ENDING_SOON:
        qb.orderBy('a.endTime', 'ASC');
        break;
      case AuctionSearchSort.PRICE_ASC:
        qb.orderBy('a.currentPrice', 'ASC');
        break;
      case AuctionSearchSort.MOST_BIDS:
        qb.orderBy('a.bidCount', 'DESC');
        break;
      default:
        qb.orderBy('a.createdAt', 'DESC');
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
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product)
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Ürün bulunamadı',
      });

    // WR-01: Optimistic insert — eliminates TOCTOU race on double-tap
    try {
      const fav = this.favoriteRepo.create({ userId, productId });
      await this.favoriteRepo.save(fav);
      await this.productRepo.increment({ id: productId }, 'favoriteCount', 1);
      return {
        code: RC.FAVORITE_ADDED,
        message: 'Favorilere eklendi',
        isFavorited: true,
      };
    } catch (err: unknown) {
      // Unique constraint violation (23505) → favorite exists, remove it
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        const deleteResult = await this.favoriteRepo.delete({
          userId,
          productId,
        });

        if ((deleteResult.affected ?? 0) > 0) {
          // C5: favoriteCount negatife düşmesini engelle (GREATEST ile 0 floor)
          await this.productRepo
            .createQueryBuilder()
            .update()
            .set({ favoriteCount: () => 'GREATEST("favoriteCount" - 1, 0)' })
            .where('id = :id', { id: productId })
            .execute();
        }

        return {
          code: RC.FAVORITE_REMOVED,
          message: 'Favorilerden çıkarıldı',
          isFavorited: false,
        };
      }
      throw err;
    }
  }

  async getFavorites(userId: string, page = 1, limit = 20) {
    const pagination = this.normalizePagination(page, limit);
    const [favs, total] = await this.favoriteRepo
      .createQueryBuilder('f')
      .innerJoinAndSelect(
        'f.product',
        'product',
        'product.deletedAt IS NULL AND product.status = :status',
        { status: ProductStatus.ACTIVE },
      )
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .where('f.userId = :userId', { userId })
      .orderBy('f.createdAt', 'DESC')
      .skip((pagination.page - 1) * pagination.limit)
      .take(pagination.limit)
      .getManyAndCount();

    return {
      items: favs.map((f) => ({
        ...this.toProductResponse(f.product),
        isFavorited: true,
        favoritedAt: f.createdAt,
      })),
      total,
      page: pagination.page,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  private async annotateSponsoredProducts<
    T extends { id: string; categoryId?: string | null },
  >(items: T[], placementType: AdPlacementType, categoryId?: string) {
    if (!this.adsService) {
      return items.map((item) => ({ ...item, isSponsored: false }));
    }
    return this.adsService.annotateSponsoredProducts(
      items,
      placementType,
      categoryId,
    );
  }

  private async applyMembershipVisibilityBoost<
    T extends { sellerId?: string | null },
  >(items: T[]) {
    const membershipService = this.membershipService;
    if (!membershipService) return items;

    const boosted = await Promise.all(
      items.map(async (item, index) => {
        if (!item.sellerId) return { item, index };
        const benefits = await membershipService.getSellerBenefits(
          item.sellerId,
        );
        return {
          item: {
            ...item,
            visibilityBoost: Math.max(0, Number(benefits.visibilityBoost ?? 0)),
          },
          index,
        };
      }),
    );

    return boosted
      .sort((left, right) => {
        const leftBoost = Number(
          (left.item as T & { visibilityBoost?: number }).visibilityBoost ?? 0,
        );
        const rightBoost = Number(
          (right.item as T & { visibilityBoost?: number }).visibilityBoost ?? 0,
        );
        return rightBoost - leftBoost || left.index - right.index;
      })
      .map(({ item }) => item);
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
      images:
        p.images?.map((img) => ({
          id: img.id,
          url: img.url,
          sortOrder: img.sortOrder,
          isPrimary: img.isPrimary,
        })) || [],
      status: p.status,
      sellerId: p.sellerId,
      sellerName: p.seller
        ? `${p.seller.firstName || ''} ${p.seller.lastName || ''}`.trim()
        : null,
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
