import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from '../product/entities/product.entity';
import { Auction } from '../auction/entities/auction.entity';
import { Favorite } from './entities/favorite.entity';
import { ProductStatus } from '../../shared/types/product-status.enum';
import { ProductCondition } from '../../shared/types/product-condition.enum';
import { ListingType } from '../../shared/types/listing-type.enum';
import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuctionStatus } from '../../shared/types/auction-status.enum';
import { RC } from '../../shared/constants/response-codes';
import {
  AuctionSearchStatus,
  ProductSearchSort,
  SearchAuctionsDto,
  SearchProductsDto,
} from './dto/search.dto';

type FavoriteQueryBuilderMock = {
  innerJoinAndSelect: jest.Mock;
  leftJoinAndSelect: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getManyAndCount: jest.Mock;
};

type ProductRepositoryMock = {
  createQueryBuilder: jest.Mock;
  findOne: jest.Mock;
  increment: jest.Mock;
  decrement: jest.Mock;
};

type AuctionRepositoryMock = {
  createQueryBuilder: jest.Mock;
};

type FavoriteRepositoryMock = {
  find: jest.Mock;
  findOne: jest.Mock;
  findAndCount: jest.Mock;
  createQueryBuilder: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
  delete: jest.Mock;
};

describe('SearchService', () => {
  let service: SearchService;
  let productRepo: ProductRepositoryMock;
  let auctionRepo: AuctionRepositoryMock;
  let favoriteRepo: FavoriteRepositoryMock;
  let favoriteQb: FavoriteQueryBuilderMock;

  const mockProduct = {
    id: 'p1',
    title: 'Test Ürün',
    description: 'Açıklama',
    price: 1000,
    imageUrl: null,
    status: ProductStatus.ACTIVE,
    sellerId: 'seller-1',
    categoryId: null,
    stockQuantity: 5,
    condition: ProductCondition.NEW,
    listingType: ListingType.DIRECT_SALE,
    originCountry: 'TR',
    favoriteCount: 0,
    images: [],
    seller: { firstName: 'Test', lastName: 'Seller' },
    category: null,
    createdAt: new Date(),
  };

  const mockAuction = {
    id: 'auction-1',
    product: {
      title: 'Nadir Kilim',
      imageUrl: 'https://example.com/kilim.jpg',
      category: { name: 'El Sanatlari' },
    },
    startPrice: 1000,
    currentPrice: 1500,
    reservePrice: 2000,
    reserveMet: false,
    bidCount: 3,
    status: AuctionStatus.ACTIVE,
    startTime: new Date('2026-05-18T08:00:00.000Z'),
    endTime: new Date('2026-05-18T10:00:00.000Z'),
    createdAt: new Date('2026-05-18T07:00:00.000Z'),
  };

  // Mock QueryBuilder
  const mockQb = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockProduct], 1]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    favoriteQb = {
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    productRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        ...mockQb,
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
      }),
      findOne: jest.fn(),
      increment: jest.fn().mockResolvedValue(undefined),
      decrement: jest.fn().mockResolvedValue(undefined),
    };

    auctionRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        ...mockQb,
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    favoriteRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      createQueryBuilder: jest.fn().mockReturnValue(favoriteQb),
      create: jest.fn((data) => ({ id: 'fav-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      remove: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(Auction), useValue: auctionRepo },
        { provide: getRepositoryToken(Favorite), useValue: favoriteRepo },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  // ==========================================
  // searchProducts
  // ==========================================
  describe('searchProducts', () => {
    it('should return paginated products', async () => {
      const result = await service.searchProducts({});

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });

    it('should apply text search with ILIKE', async () => {
      await service.searchProducts({ q: 'halı' });

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        '(p.title ILIKE :q OR p.description ILIKE :q)',
        { q: '%halı%' },
      );
    });

    it('should apply price filter', async () => {
      await service.searchProducts({ minPrice: 100, maxPrice: 5000 });

      expect(mockQb.andWhere).toHaveBeenCalledWith('p.price >= :minPrice', {
        minPrice: 100,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith('p.price <= :maxPrice', {
        maxPrice: 5000,
      });
    });

    it('should apply condition filter', async () => {
      await service.searchProducts({ condition: ProductCondition.EXCELLENT });

      expect(mockQb.andWhere).toHaveBeenCalledWith('p.condition = :condition', {
        condition: 'EXCELLENT',
      });
    });

    it('should sort by price ascending', async () => {
      await service.searchProducts({ sort: ProductSearchSort.PRICE_ASC });

      expect(mockQb.orderBy).toHaveBeenCalledWith('p.price', 'ASC');
    });

    it('should sort by popular (favoriteCount)', async () => {
      await service.searchProducts({ sort: ProductSearchSort.POPULAR });

      expect(mockQb.orderBy).toHaveBeenCalledWith('p.favoriteCount', 'DESC');
    });

    it('should include isFavorited when userId provided', async () => {
      favoriteRepo.find.mockResolvedValue([{ productId: 'p1' }]);

      const result = await service.searchProducts({}, 'user-1');

      expect(result.items[0].isFavorited).toBe(true);
    });

    it('should normalize invalid pagination before skip/take', async () => {
      await service.searchProducts({ page: -3, limit: Number.NaN });

      expect(mockQb.skip).toHaveBeenCalledWith(0);
      expect(mockQb.take).toHaveBeenCalledWith(20);
    });
  });

  // ==========================================
  // searchAuctions
  // ==========================================
  describe('searchAuctions', () => {
    it('should return paginated auctions', async () => {
      const result = await service.searchAuctions({});

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should expose reserve fields in auction search results', async () => {
      const auctionQueryBuilder = {
        ...mockQb,
        getManyAndCount: jest.fn().mockResolvedValue([[mockAuction], 1]),
      };
      auctionRepo.createQueryBuilder.mockReturnValueOnce(auctionQueryBuilder);

      const result = await service.searchAuctions({});

      expect(result.items[0]).toMatchObject({
        id: 'auction-1',
        reservePrice: 2000,
        reserveMet: false,
      });
    });

    it('should restrict omitted auction status to public statuses', async () => {
      await service.searchAuctions({});

      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'a.status IN (:...statuses)',
        {
          statuses: [
            AuctionStatus.PUBLISHED,
            AuctionStatus.ACTIVE,
            AuctionStatus.ENDED,
          ],
        },
      );
    });

    it('should filter active auctions with AuctionStatus enum values', async () => {
      await service.searchAuctions({ status: AuctionSearchStatus.ACTIVE });

      expect(mockQb.andWhere).toHaveBeenCalledWith('a.status = :status', {
        status: AuctionStatus.ACTIVE,
      });
    });
  });

  // ==========================================
  // unifiedSearch
  // ==========================================
  describe('unifiedSearch', () => {
    it('should return both products and auctions', async () => {
      const result = await service.unifiedSearch('test');

      expect(result.products).toBeDefined();
      expect(result.auctions).toBeDefined();
      expect(result.totalProducts).toBeDefined();
      expect(result.totalAuctions).toBeDefined();
    });
  });

  // ==========================================
  // toggleFavorite
  // ==========================================
  describe('toggleFavorite', () => {
    it('should add to favorites', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct);
      favoriteRepo.findOne.mockResolvedValue(null);

      const result = await service.toggleFavorite('user-1', 'p1');

      expect(result.isFavorited).toBe(true);
      expect(result.code).toBe(RC.FAVORITE_ADDED);
      expect(favoriteRepo.save).toHaveBeenCalled();
      expect(productRepo.increment).toHaveBeenCalledWith(
        { id: 'p1' },
        'favoriteCount',
        1,
      );
    });

    it('should remove from favorites (optimistic insert → 23505 → remove)', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct);
      // WR-01: Optimistic insert fails with unique constraint violation
      const uniqueError = new Error('duplicate key value');
      (uniqueError as { code?: string }).code = '23505';
      favoriteRepo.save.mockRejectedValueOnce(uniqueError);
      favoriteRepo.findOne.mockResolvedValue({
        id: 'fav-1',
        userId: 'user-1',
        productId: 'p1',
      });

      const result = await service.toggleFavorite('user-1', 'p1');

      expect(result.isFavorited).toBe(false);
      expect(result.code).toBe(RC.FAVORITE_REMOVED);
      expect(favoriteRepo.delete).toHaveBeenCalledWith({
        userId: 'user-1',
        productId: 'p1',
      });
      // C5: favoriteCount decrement via GREATEST() queryBuilder
      expect(productRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('should not decrement favoriteCount when duplicate removal deletes no row', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct);
      const uniqueError = new Error('duplicate key value');
      (uniqueError as { code?: string }).code = '23505';
      favoriteRepo.save.mockRejectedValueOnce(uniqueError);
      favoriteRepo.delete.mockResolvedValueOnce({ affected: 0 });

      const result = await service.toggleFavorite('user-1', 'p1');

      expect(result.isFavorited).toBe(false);
      expect(favoriteRepo.delete).toHaveBeenCalledWith({
        userId: 'user-1',
        productId: 'p1',
      });
      expect(productRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for missing product', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(
        service.toggleFavorite('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================
  // getFavorites
  // ==========================================
  describe('getFavorites', () => {
    it('should return paginated favorites', async () => {
      favoriteQb.getManyAndCount.mockResolvedValue([
        [{ product: mockProduct, createdAt: new Date() }],
        1,
      ]);

      const result = await service.getFavorites('user-1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].isFavorited).toBe(true);
    });

    it('should count only active non-deleted product favorites', async () => {
      await service.getFavorites('user-1', -1, Number.NaN);

      expect(favoriteRepo.createQueryBuilder).toHaveBeenCalledWith('f');
      expect(favoriteQb.innerJoinAndSelect).toHaveBeenCalledWith(
        'f.product',
        'product',
        'product.deletedAt IS NULL AND product.status = :status',
        { status: ProductStatus.ACTIVE },
      );
      expect(favoriteQb.skip).toHaveBeenCalledWith(0);
      expect(favoriteQb.take).toHaveBeenCalledWith(20);
      expect(favoriteRepo.findAndCount).not.toHaveBeenCalled();
    });
  });

  describe('Search DTO validation', () => {
    it('should transform inStock=false to false without applying truthy boolean coercion', async () => {
      const dto = plainToInstance(SearchProductsDto, { inStock: 'false' });

      expect(dto.inStock).toBe(false);
      await expect(validate(dto)).resolves.toHaveLength(0);
    });

    it('should reject invalid product sort, decimal page, and oversized limit', async () => {
      const dto = plainToInstance(SearchProductsDto, {
        sort: 'unknown',
        page: 1.5,
        limit: 51,
      });

      await expect(validate(dto)).resolves.not.toHaveLength(0);
    });

    it('should reject invalid auction status and sort values', async () => {
      const dto = plainToInstance(SearchAuctionsDto, {
        status: 'cancelled',
        sort: 'random',
      });

      await expect(validate(dto)).resolves.not.toHaveLength(0);
    });
  });
});
