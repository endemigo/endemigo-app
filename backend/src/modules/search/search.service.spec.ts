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

describe('SearchService', () => {
  let service: SearchService;
  let productRepo: any;
  let auctionRepo: any;
  let favoriteRepo: any;

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
    productRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
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
      create: jest.fn((data) => ({ id: 'fav-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      remove: jest.fn().mockResolvedValue(undefined),
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

      expect(mockQb.andWhere).toHaveBeenCalledWith('p.price >= :minPrice', { minPrice: 100 });
      expect(mockQb.andWhere).toHaveBeenCalledWith('p.price <= :maxPrice', { maxPrice: 5000 });
    });

    it('should apply condition filter', async () => {
      await service.searchProducts({ condition: ProductCondition.EXCELLENT });

      expect(mockQb.andWhere).toHaveBeenCalledWith('p.condition = :condition', { condition: 'EXCELLENT' });
    });

    it('should sort by price ascending', async () => {
      await service.searchProducts({ sort: 'price_asc' });

      expect(mockQb.orderBy).toHaveBeenCalledWith('p.price', 'ASC');
    });

    it('should sort by popular (favoriteCount)', async () => {
      await service.searchProducts({ sort: 'popular' });

      expect(mockQb.orderBy).toHaveBeenCalledWith('p.favoriteCount', 'DESC');
    });

    it('should include isFavorited when userId provided', async () => {
      favoriteRepo.find.mockResolvedValue([{ productId: 'p1' }]);

      const result = await service.searchProducts({}, 'user-1');

      expect(result.items[0].isFavorited).toBe(true);
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
      expect(favoriteRepo.save).toHaveBeenCalled();
      expect(productRepo.increment).toHaveBeenCalledWith({ id: 'p1' }, 'favoriteCount', 1);
    });

    it('should remove from favorites', async () => {
      productRepo.findOne.mockResolvedValue(mockProduct);
      favoriteRepo.findOne.mockResolvedValue({ id: 'fav-1', userId: 'user-1', productId: 'p1' });

      const result = await service.toggleFavorite('user-1', 'p1');

      expect(result.isFavorited).toBe(false);
      expect(favoriteRepo.remove).toHaveBeenCalled();
      expect(productRepo.decrement).toHaveBeenCalledWith({ id: 'p1' }, 'favoriteCount', 1);
    });

    it('should throw NotFoundException for missing product', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.toggleFavorite('user-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  // ==========================================
  // getFavorites
  // ==========================================
  describe('getFavorites', () => {
    it('should return paginated favorites', async () => {
      favoriteRepo.findAndCount.mockResolvedValue([
        [{ product: mockProduct, createdAt: new Date() }],
        1,
      ]);

      const result = await service.getFavorites('user-1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].isFavorited).toBe(true);
    });
  });
});
