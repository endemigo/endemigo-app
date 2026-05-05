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
import { RC } from '../../shared/constants/response-codes';

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
  findOne: jest.Mock;
  increment: jest.Mock;
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

describe('FavoritesService behavior', () => {
  let service: SearchService;
  let productRepo: ProductRepositoryMock;
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

  beforeEach(async () => {
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
        {
          provide: getRepositoryToken(Auction),
          useValue: { createQueryBuilder: jest.fn() },
        },
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
    expect(result.code).toBe(RC.FAVORITE_ADDED);
    expect(favoriteRepo.save).toHaveBeenCalled();
    expect(productRepo.increment).toHaveBeenCalledWith(
      { id: 'p1' },
      'favoriteCount',
      1,
    );
  });

  it('removes a product from favorites on duplicate insert', async () => {
    productRepo.findOne.mockResolvedValue(mockProduct);
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
    expect(productRepo.createQueryBuilder).toHaveBeenCalled();
  });

  it('does not decrement when duplicate removal deletes no favorite row', async () => {
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

  it('rejects missing products', async () => {
    productRepo.findOne.mockResolvedValue(null);

    await expect(service.toggleFavorite('user-1', 'missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('returns paginated favorite products', async () => {
    favoriteQb.getManyAndCount.mockResolvedValue([
      [{ product: mockProduct, createdAt: new Date() }],
      1,
    ]);

    const result = await service.getFavorites('user-1');

    expect(result.items).toHaveLength(1);
    expect(result.items[0].isFavorited).toBe(true);
    expect(result.total).toBe(1);
  });

  it('filters favorite counts through active non-deleted products', async () => {
    await service.getFavorites('user-1', -10, Number.NaN);

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
