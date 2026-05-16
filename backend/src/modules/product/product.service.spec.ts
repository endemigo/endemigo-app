import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { Category } from './entities/category.entity';
import { VariantNumber } from './entities/variant-number.entity';
import { ProductVariantSku } from './entities/product-variant-sku.entity';
import { Favorite } from '../search/entities/favorite.entity';
import { UserService } from '../user/user.service';
import { ProductStatus } from '../../shared/types/product-status.enum';
import { ProductCondition } from '../../shared/types/product-condition.enum';
import { ListingType } from '../../shared/types/listing-type.enum';
import { STORAGE_SERVICE } from '../../shared/storage/storage.interface';
import { CreateProductDto } from './dto/create-product.dto';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RC } from '../../shared/constants/response-codes';

describe('ProductService', () => {
  let service: ProductService;
  let productRepo: any;
  let imageRepo: any;
  let categoryRepo: any;
  let variantNumberRepo: any;
  let productVariantSkuRepo: any;
  let favoriteRepo: any;
  let userService: any;
  let storageService: any;

  const mockSeller = {
    id: 'seller-1',
    email: 'seller@test.com',
    firstName: 'Satıcı',
    lastName: 'Test',
    isSeller: true,
    isActive: true,
  };

  const mockProduct = {
    id: 'product-1',
    title: 'Antik Halı',
    description: 'El yapımı',
    price: 25000,
    imageUrl: null,
    status: ProductStatus.DRAFT,
    sellerId: 'seller-1',
    categoryId: null,
    stockQuantity: 5,
    sku: 'HALI-001',
    geoIndicationCertNo: 'CI-2024-001',
    geoIndicationRegion: 'Hereke',
    originCountry: 'TR',
    originRegion: 'Marmara',
    condition: ProductCondition.EXCELLENT,
    listingType: ListingType.DIRECT_SALE,
    askPriceEnabled: false,
    askPriceMinAmount: null,
    dimensionWidth: 200,
    dimensionHeight: 300,
    dimensionDepth: 2,
    weight: 8.5,
    images: [],
    seller: mockSeller,
    category: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const productQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest
        .fn()
        .mockResolvedValue([
          [{ ...mockProduct, status: ProductStatus.ACTIVE }],
          1,
        ]),
    };

    productRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(productQb),
      create: jest.fn((data) => ({ ...mockProduct, ...data })),
      save: jest.fn((entity) => Promise.resolve({ ...mockProduct, ...entity })),
      softDelete: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      manager: {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
      },
    };

    imageRepo = {
      findOne: jest.fn(),
      create: jest.fn((data) => ({ id: 'img-1', ...data })),
      save: jest.fn((entity) => Promise.resolve(entity)),
      softDelete: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    categoryRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((entity) => Promise.resolve({ id: 'cat-1', ...entity })),
    };

    variantNumberRepo = {
      findBy: jest.fn().mockResolvedValue([]),
    };

    productVariantSkuRepo = {
      create: jest.fn((data) => data),
      save: jest.fn().mockResolvedValue([]),
      find: jest.fn().mockResolvedValue([]),
      softDelete: jest.fn().mockResolvedValue(undefined),
    };

    favoriteRepo = {
      findOne: jest.fn(),
    };

    userService = {
      findById: jest.fn(),
    };

    storageService = {
      upload: jest
        .fn()
        .mockResolvedValue('/uploads/products/product-1/test.webp'),
      delete: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(ProductImage), useValue: imageRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: getRepositoryToken(VariantNumber), useValue: variantNumberRepo },
        { provide: getRepositoryToken(ProductVariantSku), useValue: productVariantSkuRepo },
        { provide: getRepositoryToken(Favorite), useValue: favoriteRepo },
        { provide: UserService, useValue: userService },
        { provide: STORAGE_SERVICE, useValue: storageService },
      ],
    }).compile();

    service = module.get<ProductService>(ProductService);
  });

  // ==========================================
  // create
  // ==========================================
  describe('create', () => {
    it('should create product with DRAFT status', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      productRepo.save.mockResolvedValue({ ...mockProduct });
      productRepo.findOne.mockResolvedValue({ ...mockProduct });

      const result = await service.create('seller-1', {
        title: 'Antik Halı',
        price: 25000,
        stockQuantity: 5,
        condition: ProductCondition.EXCELLENT,
      });

      expect(result.code).toBe(RC.PRODUCT_CREATED);
      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.DRAFT }),
      );
    });

    it('should ignore client-supplied imageUrl during creation', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      productRepo.save.mockResolvedValue({ ...mockProduct });
      productRepo.findOne.mockResolvedValue({ ...mockProduct });

      await service.create('seller-1', {
        title: 'Antik Halı',
        price: 25000,
        imageUrl: 'https://example.com/bypass.jpg',
      } as CreateProductDto & { imageUrl: string });

      expect(productRepo.create.mock.calls[0][0]).not.toHaveProperty(
        'imageUrl',
      );
    });

    it('should reject non-seller', async () => {
      userService.findById.mockResolvedValue({
        ...mockSeller,
        isSeller: false,
      });

      await expect(
        service.create('buyer-1', { title: 'X', price: 100 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject non-existent user', async () => {
      userService.findById.mockResolvedValue(null);

      await expect(
        service.create('nonexistent', { title: 'X', price: 100 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject auction products with Ask Price enabled', async () => {
      userService.findById.mockResolvedValue(mockSeller);

      await expect(
        service.create('seller-1', {
          title: 'Auction Hook',
          price: 1000,
          listingType: ListingType.AUCTION,
          askPriceEnabled: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // update
  // ==========================================
  describe('update', () => {
    it('should update product fields', async () => {
      productRepo.findOne
        .mockResolvedValueOnce({ ...mockProduct }) // first call: ownership check
        .mockResolvedValueOnce({
          ...mockProduct,
          title: 'Updated',
          images: [],
          seller: mockSeller,
        }); // second call: findById

      const result = await service.update('seller-1', 'product-1', {
        title: 'Updated',
      });

      expect(result.code).toBe(RC.PRODUCT_UPDATED);
      expect(productRepo.save).toHaveBeenCalled();
    });

    it('should reject update by non-owner', async () => {
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        sellerId: 'other-seller',
      });

      await expect(
        service.update('seller-1', 'product-1', { title: 'Hack' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for missing product', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('seller-1', 'nonexistent', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should require uploaded image records when activating', async () => {
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        imageUrl: '/uploads/products/product-1/bypass.webp',
        images: [],
        description: 'Yeterince uzun ürün açıklaması',
        categoryId: 'cat-1',
        price: 100,
      });

      await expect(
        service.update('seller-1', 'product-1', {
          status: ProductStatus.ACTIVE,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==========================================
  // remove
  // ==========================================
  describe('remove', () => {
    it('should soft-delete product', async () => {
      productRepo.findOne.mockResolvedValue({ ...mockProduct });

      const result = await service.remove('seller-1', 'product-1');

      expect(result.code).toBe(RC.PRODUCT_DELETED);
      expect(productRepo.softDelete).toHaveBeenCalledWith('product-1');
    });

    it('should reject delete by non-owner', async () => {
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        sellerId: 'other',
      });

      await expect(service.remove('seller-1', 'product-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.remove('seller-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==========================================
  // uploadImage
  // ==========================================
  describe('uploadImage', () => {
    const mockFile = {
      buffer: Buffer.from('fake-image'),
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    it('should upload image and set first as primary', async () => {
      productRepo.findOne.mockResolvedValue({ ...mockProduct, images: [] });

      const result = await service.uploadImage(
        'seller-1',
        'product-1',
        mockFile,
      );

      expect(result.code).toBe(RC.IMAGE_UPLOADED);
      expect(result.image.isPrimary).toBe(true);
      expect(storageService.upload).toHaveBeenCalled();
      expect(productRepo.save).toHaveBeenCalled(); // imageUrl sync
    });

    it('should set subsequent images as non-primary', async () => {
      const existingImages = [{ id: 'img-0', isPrimary: true }];
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        images: existingImages,
      });

      const result = await service.uploadImage(
        'seller-1',
        'product-1',
        mockFile,
      );

      expect(result.image.isPrimary).toBe(false);
    });

    it('should reject when max images reached', async () => {
      const tenImages = Array.from({ length: 10 }, (_, i) => ({
        id: `img-${i}`,
      }));
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        images: tenImages,
      });

      await expect(
        service.uploadImage('seller-1', 'product-1', mockFile),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject upload by non-owner', async () => {
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        sellerId: 'other',
      });

      await expect(
        service.uploadImage('seller-1', 'product-1', mockFile),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ==========================================
  // deleteImage
  // ==========================================
  describe('deleteImage', () => {
    it('should delete image and call storage.delete', async () => {
      imageRepo.findOne.mockResolvedValue({
        id: 'img-1',
        productId: 'product-1',
        url: '/uploads/products/product-1/test.webp',
        isPrimary: false,
        product: { sellerId: 'seller-1' },
      });

      const result = await service.deleteImage('seller-1', 'img-1');

      expect(result.code).toBe(RC.IMAGE_DELETED);
      expect(storageService.delete).toHaveBeenCalled();
      expect(imageRepo.delete).toHaveBeenCalledWith('img-1');
    });

    it('should promote next image when primary deleted', async () => {
      imageRepo.findOne
        .mockResolvedValueOnce({
          id: 'img-1',
          productId: 'product-1',
          url: '/uploads/old.webp',
          isPrimary: true,
          product: { sellerId: 'seller-1' },
        })
        .mockResolvedValueOnce({
          id: 'img-2',
          url: '/uploads/new.webp',
          isPrimary: false,
          sortOrder: 1,
        });

      await service.deleteImage('seller-1', 'img-1');

      expect(imageRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isPrimary: true }),
      );
      expect(productRepo.update).toHaveBeenCalledWith(
        'product-1',
        expect.objectContaining({ imageUrl: '/uploads/new.webp' }),
      );
    });

    it('should reject delete by non-owner', async () => {
      imageRepo.findOne.mockResolvedValue({
        id: 'img-1',
        product: { sellerId: 'other' },
      });

      await expect(service.deleteImage('seller-1', 'img-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ==========================================
  // findAll
  // ==========================================
  describe('findAll', () => {
    it('should return paginated active products', async () => {
      const result = await service.findAll(1, 20);

      expect(result.code).toBe(RC.PRODUCT_LIST);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(productRepo.createQueryBuilder).toHaveBeenCalledWith('p');
    });

    it('should sort by favorite count for likes feed', async () => {
      const qb = productRepo.createQueryBuilder();

      await service.findAll(1, 20, 'likes');

      expect(qb.orderBy).toHaveBeenCalledWith('p.favoriteCount', 'DESC');
      expect(qb.addOrderBy).toHaveBeenCalledWith('p.createdAt', 'DESC');
    });
  });

  describe('categories', () => {
    it('returns active categories in response-code envelope', async () => {
      categoryRepo.find.mockResolvedValue([
        {
          id: 'cat-1',
          name: 'Root',
          children: [
            { id: 'cat-2', name: 'Active child', isActive: true, sortOrder: 2 },
            {
              id: 'cat-3',
              name: 'Inactive child',
              isActive: false,
              sortOrder: 1,
            },
          ],
        },
      ]);

      const result = await service.findCategories();

      expect(result).toMatchObject({
        code: RC.CATEGORY_LIST,
        message: expect.any(String),
        categories: [
          {
            id: 'cat-1',
            children: [{ id: 'cat-2' }],
          },
        ],
      });
    });

    it('seeds category metadata with stable image urls', async () => {
      const categoryStore = new Map<string, Record<string, unknown>>([
        [
          'elektronik',
          {
            id: 'root-electronic',
            slug: 'elektronik',
            name: 'Legacy Electronics',
            description: 'legacy description',
            imageUrl: 'https://legacy.example/electronics.jpg',
            sortOrder: 99,
            isActive: false,
            isCulturalAsset: false,
          },
        ],
        [
          'elektronik-cep-telefonu',
          {
            id: 'child-phone',
            slug: 'elektronik-cep-telefonu',
            name: 'Legacy Phone',
            parentId: 'old-parent',
            description: null,
            imageUrl: null,
            sortOrder: 77,
            isActive: false,
            isCulturalAsset: false,
          },
        ],
        [
          'legacy-bedroom',
          {
            id: 'legacy-bedroom',
            slug: 'legacy-bedroom',
            name: 'Yatak Odası',
            parentId: 'old-parent',
            description: 'legacy bedroom',
            imageUrl: 'https://legacy.example/bedroom.jpg',
            sortOrder: 12,
            isActive: true,
            isCulturalAsset: false,
          },
        ],
      ]);
      let generatedId = 1;

      categoryRepo.findOne.mockImplementation(async ({ where }) => {
        if (where.slug) {
          return categoryStore.get(where.slug) ?? null;
        }

        if (where.name) {
          return (
            Array.from(categoryStore.values()).find(
              (category) => category.name === where.name,
            ) ?? null
          );
        }

        return null;
      });
      categoryRepo.create.mockImplementation((data) => data);
      categoryRepo.save.mockImplementation(async (entity) => {
        const savedEntity = {
          ...entity,
          id: entity.id ?? `seeded-category-${generatedId++}`,
        };
        categoryStore.set(savedEntity.slug, savedEntity);
        return savedEntity;
      });
      categoryRepo.find.mockImplementation(async () => {
        const allCategories = Array.from(categoryStore.values());

        return allCategories
          .filter(
            (category) => !category.parentId && category.isActive !== false,
          )
          .sort(
            (left, right) => Number(left.sortOrder) - Number(right.sortOrder),
          )
          .map((root) => ({
            ...root,
            children: allCategories
              .filter(
                (category) =>
                  category.parentId === root.id && category.isActive !== false,
              )
              .sort(
                (left, right) =>
                  Number(left.sortOrder) - Number(right.sortOrder),
              ),
          }));
      });

      const result = await service.seedCategories();

      expect(result.code).toBe(RC.CATEGORY_SEEDED);
      expect(result.categories).toHaveLength(9);
      expect(categoryStore.get('elektronik')).toMatchObject({
        id: 'root-electronic',
        name: 'Elektronik',
        sortOrder: 1,
        isActive: true,
        imageUrl:
          'https://commons.wikimedia.org/wiki/Special:FilePath/A%20laptop%20as%20a%20computer%20machine.jpg',
      });
      expect(categoryStore.get('elektronik-cep-telefonu')).toMatchObject({
        id: 'child-phone',
        parentId: 'root-electronic',
        sortOrder: 1,
        isActive: true,
        imageUrl:
          'https://commons.wikimedia.org/wiki/Special:FilePath/Smartphone.png',
      });
      expect(categoryStore.get('mobilya-dekor-yatak-odasi')).toMatchObject({
        id: 'legacy-bedroom',
        name: 'Yatak Odası',
      });
      expect(categoryStore.get('antika-koleksiyon')).toMatchObject({
        isCulturalAsset: true,
      });
    });
  });

  // ==========================================
  // findMyProducts
  // ==========================================
  describe('findMyProducts', () => {
    it('should return all products for seller (any status)', async () => {
      productRepo.findAndCount.mockResolvedValue([
        [
          { ...mockProduct, status: ProductStatus.DRAFT },
          { ...mockProduct, id: 'p2', status: ProductStatus.ACTIVE },
        ],
        2,
      ]);

      const result = await service.findMyProducts('seller-1');

      expect(result.code).toBe(RC.PRODUCT_LIST);
      expect(result.items).toHaveLength(2);
      expect(productRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { sellerId: 'seller-1' },
        }),
      );
    });
  });

  // ==========================================
  // findById
  // ==========================================
  describe('findById', () => {
    it('should return product with relations', async () => {
      productRepo.findOne.mockResolvedValue({ ...mockProduct });

      const result = await service.findById('product-1');

      expect(result.code).toBe(RC.PRODUCT_FETCHED);
      expect(result.id).toBe('product-1');
      expect(result.condition).toBe(ProductCondition.EXCELLENT);
      expect(result.listingType).toBe(ListingType.DIRECT_SALE);
    });

    it('should include favorite state when userId is provided', async () => {
      productRepo.findOne.mockResolvedValue({ ...mockProduct });
      favoriteRepo.findOne.mockResolvedValue({ id: 'fav-1' });

      const result = await service.findById('product-1', 'user-1');

      expect(result.isFavorited).toBe(true);
      expect(favoriteRepo.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1', productId: 'product-1' },
        select: ['id'],
      });
    });

    it('should throw NotFoundException', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findPublicById', () => {
    it('should only fetch ACTIVE products for public detail', async () => {
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.ACTIVE,
      });

      const result = await service.findPublicById('product-1');

      expect(result.code).toBe(RC.PRODUCT_FETCHED);
      expect(productRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'product-1', status: ProductStatus.ACTIVE },
        }),
      );
    });

    it('should hide non-active products from public detail', async () => {
      productRepo.findOne.mockResolvedValue(null);

      await expect(service.findPublicById('product-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should keep minimum offer visible while hiding sale price for Ask Price products', async () => {
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.ACTIVE,
        askPriceEnabled: true,
        askPriceMinAmount: 10000,
      });

      const result = await service.findPublicById('product-1');

      expect(result.price).toBeNull();
      expect(result.askPriceMinAmount).toBe(10000);
    });
  });

  describe('findById', () => {
    it('should keep price visible for the product owner', async () => {
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        status: ProductStatus.ACTIVE,
        askPriceEnabled: true,
        askPriceMinAmount: 10000,
      });

      const result = await service.findById('product-1', 'seller-1');

      expect(result.price).toBe(25000);
      expect(result.askPriceMinAmount).toBe(10000);
    });
  });
});
