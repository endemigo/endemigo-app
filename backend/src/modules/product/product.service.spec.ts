import { Test, TestingModule } from '@nestjs/testing';
import { ProductService } from './product.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { ProductDraft } from './entities/product-draft.entity';
import { Category } from './entities/category.entity';
import { VariantNumber } from './entities/variant-number.entity';
import { ProductVariantSku } from './entities/product-variant-sku.entity';
import { Favorite } from '../search/entities/favorite.entity';
import { UserService } from '../user/user.service';
import { ProductStatus } from '../../shared/types/product-status.enum';
import { ProductCondition } from '../../shared/types/product-condition.enum';
import { ListingType } from '../../shared/types/listing-type.enum';
import { ListingDraftEntryMode } from '../../shared/types/listing-draft-entry-mode.enum';
import { STORAGE_SERVICE } from '../../shared/storage/storage.interface';
import { CreateProductDto } from './dto/create-product.dto';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RC } from '../../shared/constants/response-codes';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';
import { ListingTemplate as ListingTemplateEntity } from './entities/listing-template.entity';
import { GeoIndication } from './entities/geo-indication.entity';
import { FeatureBadge } from './entities/feature-badge.entity';
import { ProductView } from './entities/product-view.entity';

type MockProductViewRepository = {
  findOne: jest.Mock;
  find: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  remove: jest.Mock;
  createQueryBuilder: jest.Mock;
};

type MockListingTemplateRepository = {
  find: jest.Mock;
  findOne: jest.Mock;
  exist: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

type MockProductRepository = {
  findOne: jest.Mock;
  findAndCount: jest.Mock;
  createQueryBuilder: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  softDelete: jest.Mock;
  update: jest.Mock;
  manager: {
    createQueryBuilder: jest.Mock;
  };
};

type MockDraftRepository = {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
  find: jest.Mock;
  softDelete: jest.Mock;
};

type MockImageRepository = {
  findOne: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  softDelete: jest.Mock;
  delete: jest.Mock;
};

type MockCategoryRepository = {
  find: jest.Mock;
  findOne: jest.Mock;
  exist: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
};

type MockVariantNumberRepository = {
  findBy: jest.Mock;
};

type MockProductVariantSkuRepository = {
  create: jest.Mock;
  save: jest.Mock;
  find: jest.Mock;
  softDelete: jest.Mock;
};

type MockFavoriteRepository = {
  findOne: jest.Mock;
};

type MockUserService = {
  findById: jest.Mock;
};

type MockStorageService = {
  upload: jest.Mock;
  delete: jest.Mock;
};

type MockAdminSettingsService = {
  getProductImageUploadLimits: jest.Mock;
};

describe('ProductService', () => {
  let service: ProductService;
  let productRepo: MockProductRepository;
  let draftRepo: MockDraftRepository;
  let imageRepo: MockImageRepository;
  let categoryRepo: MockCategoryRepository;
  let variantNumberRepo: MockVariantNumberRepository;
  let productVariantSkuRepo: MockProductVariantSkuRepository;
  let favoriteRepo: MockFavoriteRepository;
  let userService: MockUserService;
  let storageService: MockStorageService;
  let adminSettingsService: MockAdminSettingsService;
  let listingTemplateRepo: MockListingTemplateRepository;
  let geoIndicationRepo: any;
  let featureBadgeRepo: any;
  let productViewRepo: MockProductViewRepository;

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
      andWhere: jest.fn().mockReturnThis(),
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

    draftRepo = {
      create: jest.fn((data) => ({
        id: 'draft-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      })),
      save: jest.fn(async (entity) => ({ ...entity, updatedAt: new Date() })),
      findOne: jest.fn(),
      find: jest.fn(),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
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
      exist: jest.fn().mockResolvedValue(false),
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

    adminSettingsService = {
      getProductImageUploadLimits: jest
        .fn()
        .mockResolvedValue({ min: 1, max: 10 }),
    };

    listingTemplateRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      exist: jest.fn().mockResolvedValue(false),
      create: jest.fn((data) => data),
      save: jest.fn((entity) =>
        Promise.resolve({ id: 'template-1', ...entity }),
      ),
    };

    geoIndicationRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    featureBadgeRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };

    productViewRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => data),
      save: jest.fn((entity) => Promise.resolve(entity)),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn().mockReturnValue({
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductService,
        { provide: getRepositoryToken(Product), useValue: productRepo },
        { provide: getRepositoryToken(ProductDraft), useValue: draftRepo },
        { provide: getRepositoryToken(ProductImage), useValue: imageRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        {
          provide: getRepositoryToken(VariantNumber),
          useValue: variantNumberRepo,
        },
        {
          provide: getRepositoryToken(ProductVariantSku),
          useValue: productVariantSkuRepo,
        },
        { provide: getRepositoryToken(Favorite), useValue: favoriteRepo },
        { provide: getRepositoryToken(ProductView), useValue: productViewRepo },
        {
          provide: getRepositoryToken(ListingTemplateEntity),
          useValue: listingTemplateRepo,
        },
        {
          provide: getRepositoryToken(GeoIndication),
          useValue: geoIndicationRepo,
        },
        {
          provide: getRepositoryToken(FeatureBadge),
          useValue: featureBadgeRepo,
        },
        { provide: UserService, useValue: userService },
        { provide: STORAGE_SERVICE, useValue: storageService },
        { provide: AdminSettingsService, useValue: adminSettingsService },
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

    // Rol bazlı durum guard'ı — satıcı onay akışını atlayamaz
    it('should reject seller-supplied ACTIVE status on create', async () => {
      userService.findById.mockResolvedValue(mockSeller);

      await expect(
        service.create('seller-1', {
          title: 'Antik Halı',
          price: 25000,
          status: ProductStatus.ACTIVE,
        }),
      ).rejects.toMatchObject({
        response: { code: RC.FORBIDDEN },
      });
      expect(productRepo.create).not.toHaveBeenCalled();
    });

    it('should allow seller to create with PENDING_REVIEW status', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      productRepo.save.mockResolvedValue({ ...mockProduct });
      productRepo.findOne.mockResolvedValue({ ...mockProduct });

      await service.create('seller-1', {
        title: 'Antik Halı',
        price: 25000,
        status: ProductStatus.PENDING_REVIEW,
      });

      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.PENDING_REVIEW }),
      );
    });

    it('should allow admin actor to create with ACTIVE status', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      productRepo.save.mockResolvedValue({ ...mockProduct });
      productRepo.findOne.mockResolvedValue({ ...mockProduct });

      await service.create(
        'seller-1',
        {
          title: 'Antik Halı',
          price: 25000,
          status: ProductStatus.ACTIVE,
        },
        { roles: ['SUPER_ADMIN'] },
      );

      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.ACTIVE }),
      );
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
      adminSettingsService.getProductImageUploadLimits.mockResolvedValue({
        min: 2,
        max: 10,
      });
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        imageUrl: '/uploads/products/product-1/bypass.webp',
        images: [{ id: 'img-1' }],
        description: 'Yeterince uzun ürün açıklaması',
        categoryId: 'cat-1',
        price: 100,
      });

      // ACTIVE geçişi artık admin yetkisi gerektirir; K5 kalite kontrolü
      // admin geçişinde de çalışmaya devam eder.
      await expect(
        service.update(
          'seller-1',
          'product-1',
          { status: ProductStatus.ACTIVE },
          { isAdmin: true },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    // Rol bazlı durum guard'ı — satıcı ACTIVE/UNDER_AUCTION/SOLD geçişi yapamaz
    it.each([
      ProductStatus.ACTIVE,
      ProductStatus.UNDER_AUCTION,
      ProductStatus.SOLD,
    ])(
      'should reject seller transitioning product to %s',
      async (blockedStatus) => {
        productRepo.findOne.mockResolvedValue({ ...mockProduct });

        await expect(
          service.update('seller-1', 'product-1', { status: blockedStatus }),
        ).rejects.toMatchObject({
          response: { code: RC.FORBIDDEN },
        });
        expect(productRepo.save).not.toHaveBeenCalled();
      },
    );

    it('should allow admin actor to transition product to ACTIVE', async () => {
      productRepo.findOne
        .mockResolvedValueOnce({
          ...mockProduct,
          images: [{ id: 'img-1' }],
          description: 'Yeterince uzun ürün açıklaması',
          categoryId: 'cat-1',
          price: 100,
        })
        .mockResolvedValueOnce({
          ...mockProduct,
          status: ProductStatus.ACTIVE,
        });

      const result = await service.update(
        'seller-1',
        'product-1',
        { status: ProductStatus.ACTIVE },
        { isAdmin: true },
      );

      expect(result.code).toBe(RC.PRODUCT_UPDATED);
      expect(productRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.ACTIVE }),
      );
    });

    it('should allow seller to keep an already ACTIVE product ACTIVE (no transition)', async () => {
      productRepo.findOne
        .mockResolvedValueOnce({
          ...mockProduct,
          status: ProductStatus.ACTIVE,
          images: [{ id: 'img-1' }],
          description: 'Yeterince uzun ürün açıklaması',
          categoryId: 'cat-1',
          price: 100,
        })
        .mockResolvedValueOnce({
          ...mockProduct,
          status: ProductStatus.ACTIVE,
        });

      const result = await service.update('seller-1', 'product-1', {
        status: ProductStatus.ACTIVE,
      });

      expect(result.code).toBe(RC.PRODUCT_UPDATED);
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
  // bulkImport
  // ==========================================
  describe('bulkImport', () => {
    it('creates valid rows and reports failed rows with 1-based row numbers and reasons', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      productRepo.save.mockResolvedValue({ ...mockProduct });
      productRepo.findOne.mockResolvedValue({ ...mockProduct });

      const result = await service.bulkImport('seller-1', {
        products: [
          { title: 'Antik Halı', price: 25000 },
          { price: 100 }, // title eksik
          { title: 'Bakır Cezve', price: 0 }, // fiyat 0
          { title: 'Cam Vazo', price: 'abc' }, // fiyat sayısal değil
        ],
      });

      expect(result).toMatchObject({
        created: 1,
        failed: [
          { row: 2, reason: 'Ürün adı (title) zorunludur' },
          { row: 3, reason: "Fiyat 0'dan büyük olmalıdır" },
          { row: 4, reason: 'Fiyat sayısal bir değer olmalıdır' },
        ],
      });
      expect(productRepo.create).toHaveBeenCalledTimes(1);
    });

    it('does not abort the batch when a row fails during creation', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      productRepo.save.mockResolvedValue({ ...mockProduct });
      productRepo.findOne.mockResolvedValue({ ...mockProduct });
      // İlk satırın kategorisi geçersiz → create() BadRequest fırlatır,
      // ikinci satır yine de işlenmelidir.
      categoryRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.bulkImport('seller-1', {
        products: [
          {
            title: 'Kategorisi Bozuk',
            price: 100,
            categoryId: '550e8400-e29b-41d4-a716-446655440000',
          },
          { title: 'Antik Halı', price: 25000 },
        ],
      });

      expect(result.created).toBe(1);
      expect(result.failed).toEqual([
        { row: 1, reason: 'Geçersiz kategori seçimi' },
      ]);
    });

    it('forces seller-imported rows to DRAFT even when ACTIVE is provided', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      productRepo.save.mockResolvedValue({ ...mockProduct });
      productRepo.findOne.mockResolvedValue({ ...mockProduct });

      const result = await service.bulkImport('seller-1', {
        products: [
          { title: 'Antik Halı', price: 25000, status: ProductStatus.ACTIVE },
        ],
      });

      expect(result.created).toBe(1);
      expect(result.failed).toEqual([]);
      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.DRAFT }),
      );
    });

    it('rejects bulk import for non-sellers', async () => {
      userService.findById.mockResolvedValue({
        ...mockSeller,
        isSeller: false,
      });

      await expect(
        service.bulkImport('buyer-1', {
          products: [{ title: 'Antik Halı', price: 25000 }],
        }),
      ).rejects.toThrow(ForbiddenException);
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
      adminSettingsService.getProductImageUploadLimits.mockResolvedValue({
        min: 1,
        max: 2,
      });
      const existingImages = Array.from({ length: 2 }, (_, i) => ({
        id: `img-${i}`,
      }));
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        images: existingImages,
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

    it('returns category listing templates from metadata', async () => {
      categoryRepo.find.mockResolvedValue([
        {
          id: 'cat-1',
          name: 'Food',
          metadata: {
            listingTemplate: {
              fields: [{ key: 'productContent', type: 'text', required: true }],
              variant: { enabled: false },
            },
          },
          children: [],
        },
      ]);

      const result = await service.findCategories();

      expect(result.categories[0].listingTemplate).toMatchObject({
        fields: [{ key: 'productContent', type: 'text', required: true }],
        variant: { enabled: false },
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

  describe('listing drafts', () => {
    it('creates a backend listing draft for the seller', async () => {
      userService.findById.mockResolvedValue(mockSeller);

      const result = await service.createListingDraft('seller-1', {
        entryMode: ListingDraftEntryMode.MARKETPLACE,
        listingType: ListingType.DIRECT_SALE,
        categoryId: 'cat-1',
        currentStep: 2,
        payload: { title: 'Taslak Ürün' },
      });

      expect(result.code).toBe(RC.LISTING_DRAFT_CREATED);
      expect(draftRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerId: 'seller-1',
          entryMode: ListingDraftEntryMode.MARKETPLACE,
          listingType: ListingType.DIRECT_SALE,
          status: 'DRAFT',
        }),
      );
    });

    it('publishes a listing draft into a product', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      draftRepo.findOne.mockResolvedValue({
        id: 'draft-1',
        sellerId: 'seller-1',
        status: 'DRAFT',
        entryMode: ListingDraftEntryMode.MARKETPLACE,
        listingType: ListingType.DIRECT_SALE,
        payload: {
          title: 'Taslak Ürün',
          price: 100,
          categoryId: 'cat-1',
          stockQuantity: 1,
          listingType: ListingType.DIRECT_SALE,
        },
      });
      categoryRepo.findOne.mockResolvedValue({ id: 'cat-1', isActive: true });
      categoryRepo.exist = jest.fn(async () => false);
      productRepo.save.mockResolvedValue({
        ...mockProduct,
        id: 'product-from-draft',
      });
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        id: 'product-from-draft',
      });

      const result = await service.publishListingDraft('seller-1', 'draft-1');

      expect(result.code).toBe(RC.LISTING_DRAFT_PUBLISHED);
      expect(draftRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'PUBLISHED',
          productId: 'product-from-draft',
        }),
      );
    });

    it('ignores admin-only status smuggled into the draft payload when publishing', async () => {
      userService.findById.mockResolvedValue(mockSeller);
      draftRepo.findOne.mockResolvedValue({
        id: 'draft-1',
        sellerId: 'seller-1',
        status: 'DRAFT',
        entryMode: ListingDraftEntryMode.MARKETPLACE,
        listingType: ListingType.DIRECT_SALE,
        payload: {
          title: 'Taslak Ürün',
          price: 100,
          status: ProductStatus.ACTIVE, // izinli olmayan durum yok sayılır
        },
      });
      productRepo.save.mockResolvedValue({ ...mockProduct });
      productRepo.findOne.mockResolvedValue({ ...mockProduct });

      const result = await service.publishListingDraft('seller-1', 'draft-1');

      expect(result.code).toBe(RC.LISTING_DRAFT_PUBLISHED);
      expect(productRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductStatus.DRAFT }),
      );
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

    it('should resolve askQuestionEnabled from the product-level supplier toggle', async () => {
      productRepo.findOne.mockResolvedValue({
        ...mockProduct,
        askQuestionEnabled: true,
      });

      const result = await service.findById('product-1');
      expect(result.askQuestionEnabled).toBe(true);
    });

    it('should default askQuestionEnabled to false when the supplier toggle is off', async () => {
      productRepo.findOne.mockResolvedValue({ ...mockProduct });

      const result = await service.findById('product-1');
      expect(result.askQuestionEnabled).toBe(false);
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

  describe('recently viewed products', () => {
    describe('recordProductView', () => {
      it('should throw NotFoundException if product does not exist', async () => {
        productRepo.findOne.mockResolvedValue(null);
        await expect(
          service.recordProductView('nonexistent-product', 'user-1'),
        ).rejects.toThrow(NotFoundException);
      });

      it('should create a new view if none exists', async () => {
        productRepo.findOne.mockResolvedValue(mockProduct);
        productViewRepo.findOne.mockResolvedValue(null);

        const result = await service.recordProductView('product-1', 'user-1', {
          deviceToken: 'token-1',
          referrer: 'search',
          platform: 'mobile',
        });

        expect(result.code).toBe(RC.PRODUCT_VIEW_RECORDED);
        expect(productViewRepo.create).toHaveBeenCalledWith(
          expect.objectContaining({
            productId: 'product-1',
            userId: 'user-1',
            viewCount: 1,
            referrer: 'search',
            platform: 'mobile',
          }),
        );
        expect(productViewRepo.save).toHaveBeenCalled();
      });

      it('should increment viewCount if view exists', async () => {
        productRepo.findOne.mockResolvedValue(mockProduct);
        const existingView = {
          productId: 'product-1',
          userId: 'user-1',
          viewCount: 1,
          lastViewedAt: new Date(Date.now() - 10000),
        };
        productViewRepo.findOne.mockResolvedValue(existingView);

        await service.recordProductView('product-1', 'user-1');

        expect(existingView.viewCount).toBe(2);
        expect(productViewRepo.save).toHaveBeenCalledWith(existingView);
      });
    });

    describe('getRecentlyViewed', () => {
      it('should return empty result if no user or device token is provided', async () => {
        const result = await service.getRecentlyViewed();
        expect(result.items).toEqual([]);
        expect(result.total).toBe(0);
      });

      it('should return paginated recently viewed list', async () => {
        const mockView = {
          id: 'view-1',
          lastViewedAt: new Date(),
          product: {
            ...mockProduct,
            status: ProductStatus.ACTIVE,
            category: { name: 'Halilar' },
            images: [],
          },
        };

        const mockQb = {
          innerJoinAndSelect: jest.fn().mockReturnThis(),
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          take: jest.fn().mockReturnThis(),
          getManyAndCount: jest.fn().mockResolvedValue([[mockView], 1]),
        };

        productViewRepo.createQueryBuilder.mockReturnValue(mockQb);

        const result = await service.getRecentlyViewed(
          'user-1',
          undefined,
          1,
          10,
        );

        expect(result.items).toHaveLength(1);
        expect(result.total).toBe(1);
        expect(result.items[0].id).toBe('product-1');
        expect(result.items[0].categoryName).toBe('Halilar');
      });
    });

    describe('mergeGuestViews', () => {
      it('should merge guest views into user account', async () => {
        const guestView = {
          productId: 'product-1',
          deviceToken: 'token-1',
          userId: null,
          viewCount: 2,
          firstViewedAt: new Date(Date.now() - 20000),
          lastViewedAt: new Date(Date.now() - 10000),
        };
        productViewRepo.find.mockResolvedValue([guestView]);
        productViewRepo.findOne.mockResolvedValue(null);

        await service.mergeGuestViews('user-1', 'token-1');

        expect(guestView.userId).toBe('user-1');
        expect(guestView.deviceToken).toBeNull();
        expect(productViewRepo.save).toHaveBeenCalledWith(guestView);
      });

      it('should add counts if user view already exists', async () => {
        const guestView = {
          productId: 'product-1',
          deviceToken: 'token-1',
          userId: null,
          viewCount: 2,
          firstViewedAt: new Date(Date.now() - 20000),
          lastViewedAt: new Date(Date.now() - 10000),
        };
        const userView = {
          productId: 'product-1',
          userId: 'user-1',
          viewCount: 1,
          firstViewedAt: new Date(Date.now() - 5000),
          lastViewedAt: new Date(Date.now() - 2000),
        };

        productViewRepo.find.mockResolvedValue([guestView]);
        productViewRepo.findOne.mockResolvedValue(userView);

        await service.mergeGuestViews('user-1', 'token-1');

        expect(userView.viewCount).toBe(3);
        expect(productViewRepo.save).toHaveBeenCalledWith(userView);
        expect(productViewRepo.remove).toHaveBeenCalledWith(guestView);
      });
    });
  });
});
