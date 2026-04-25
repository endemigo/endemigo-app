import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Auction } from '../auction/entities/auction.entity';
import { Product } from '../product/entities/product.entity';
import { ProductCondition } from '../../shared/types/product-condition.enum';
import { ProductStatus } from '../../shared/types/product-status.enum';
import { ListingType } from '../../shared/types/listing-type.enum';
import { Favorite } from './entities/favorite.entity';
import { SearchService } from './search.service';

describe('FavoritesService behavior', () => {
  let service: SearchService;
  let productRepo: any;
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

  beforeEach(async () => {
    productRepo = {
      findOne: jest.fn(),
      increment: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({}),
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
        { provide: getRepositoryToken(Auction), useValue: { createQueryBuilder: jest.fn() } },
        { provide: getRepositoryToken(Favorite), useValue: favoriteRepo },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('adds a product to favorites', async () => {
    productRepo.findOne.mockResolvedValue(mockProduct);
    favoriteRepo.findOne.mockResolvedValue(null);

    const result = await service.toggleFavorite('user-1', 'p1');

    expect(result.isFavorited).toBe(true);
    expect(favoriteRepo.save).toHaveBeenCalled();
    expect(productRepo.increment).toHaveBeenCalledWith({ id: 'p1' }, 'favoriteCount', 1);
  });

  it('removes a product from favorites on duplicate insert', async () => {
    productRepo.findOne.mockResolvedValue(mockProduct);
    const uniqueError = new Error('duplicate key value');
    (uniqueError as any).code = '23505';
    favoriteRepo.save.mockRejectedValueOnce(uniqueError);
    favoriteRepo.findOne.mockResolvedValue({ id: 'fav-1', userId: 'user-1', productId: 'p1' });

    const result = await service.toggleFavorite('user-1', 'p1');

    expect(result.isFavorited).toBe(false);
    expect(favoriteRepo.remove).toHaveBeenCalled();
    expect(productRepo.createQueryBuilder).toHaveBeenCalled();
  });

  it('rejects missing products', async () => {
    productRepo.findOne.mockResolvedValue(null);

    await expect(service.toggleFavorite('user-1', 'missing')).rejects.toThrow(NotFoundException);
  });

  it('returns paginated favorite products', async () => {
    favoriteRepo.findAndCount.mockResolvedValue([
      [{ product: mockProduct, createdAt: new Date() }],
      1,
    ]);

    const result = await service.getFavorites('user-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].isFavorited).toBe(true);
    expect(result.total).toBe(1);
  });
});
