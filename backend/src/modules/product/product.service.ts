import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { Category } from './entities/category.entity';
import { Favorite } from '../search/entities/favorite.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UserService } from '../user/user.service';
import { ProductStatus } from '../../shared/types/product-status.enum';
import { ListingType } from '../../shared/types/listing-type.enum';
import { RC } from '../../shared/constants/response-codes';
import { STORAGE_SERVICE } from '../../shared/storage/storage.interface';
import type { IStorageService } from '../../shared/storage/storage.interface';
import { AdPlacementType } from '@endemigo/shared';
import { AdsService } from '../ads/ads.service';
import { TrustService } from '../trust/trust.service';
import { MembershipService } from '../membership/membership.service';

const MAX_IMAGES = 10;
const COMMONS_FILE_PATH_BASE_URL =
  'https://commons.wikimedia.org/wiki/Special:FilePath/';

type SeedCategoryDefinition = {
  name: string;
  slug: string;
  description: string;
  imageFileName: string;
  sortOrder: number;
  isCulturalAsset?: boolean;
  children?: SeedCategoryDefinition[];
};

const SEEDED_CATEGORIES: SeedCategoryDefinition[] = [
  {
    name: 'Elektronik',
    slug: 'elektronik',
    description:
      'Telefon, bilgisayar ve tablet gibi güncel teknoloji ürünleri.',
    imageFileName: 'A laptop as a computer machine.jpg',
    sortOrder: 1,
    children: [
      {
        name: 'Cep Telefonu',
        slug: 'elektronik-cep-telefonu',
        description: 'Akıllı telefonlar ve mobil cihazlar.',
        imageFileName: 'Smartphone.png',
        sortOrder: 1,
      },
      {
        name: 'Bilgisayar',
        slug: 'elektronik-bilgisayar',
        description: 'Dizüstü ve masaüstü bilgisayar seçenekleri.',
        imageFileName: 'A laptop as a computer machine.jpg',
        sortOrder: 2,
      },
      {
        name: 'Tablet',
        slug: 'elektronik-tablet',
        description: 'Taşınabilir tablet ve hibrit ekranlı cihazlar.',
        imageFileName: 'Tablet.JPG',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Antika & Koleksiyon',
    slug: 'antika-koleksiyon',
    description: 'Geçmiş dönemlere ait nadir ve koleksiyonluk parçalar.',
    imageFileName: 'Antique furniture at Antixx Unique furniture.jpg',
    sortOrder: 2,
    isCulturalAsset: true,
    children: [
      {
        name: 'Antika Mobilya',
        slug: 'antika-koleksiyon-antika-mobilya',
        description: 'Dönem karakteri taşıyan antika mobilyalar.',
        imageFileName: 'Antique furniture at Antixx Unique furniture.jpg',
        sortOrder: 1,
        isCulturalAsset: true,
      },
      {
        name: 'Madeni Para',
        slug: 'antika-koleksiyon-madeni-para',
        description: 'Nadir bulunan eski ve koleksiyonluk madeni paralar.',
        imageFileName: '-Coin coin.JPG',
        sortOrder: 2,
        isCulturalAsset: true,
      },
      {
        name: 'Pul Koleksiyonu',
        slug: 'antika-koleksiyon-pul-koleksiyonu',
        description: 'Albüm ve seri halinde saklanan koleksiyonluk pullar.',
        imageFileName: 'Stamp collection (7181777988).jpg',
        sortOrder: 3,
        isCulturalAsset: true,
      },
    ],
  },
  {
    name: 'Sanat',
    slug: 'sanat',
    description: 'Tablo, heykel ve fotoğrafçılık odaklı sanat eserleri.',
    imageFileName: 'Nommo Art Gallery.jpg',
    sortOrder: 3,
    isCulturalAsset: true,
    children: [
      {
        name: 'Tablo',
        slug: 'sanat-tablo',
        description: 'Koleksiyonluk ve dekoratif tablo eserleri.',
        imageFileName: 'Pithora wall painting.JPG',
        sortOrder: 1,
        isCulturalAsset: true,
      },
      {
        name: 'Heykel',
        slug: 'sanat-heykel',
        description: 'Taş, ahşap ve farklı materyallerden heykel çalışmaları.',
        imageFileName: 'African sculpture, Museum Humanum, 258991x.jpg',
        sortOrder: 2,
        isCulturalAsset: true,
      },
      {
        name: 'Fotoğrafçılık',
        slug: 'sanat-fotografcilik',
        description:
          'Analog ve dijital fotoğrafçılık ekipmanları ile baskılar.',
        imageFileName: 'Camera photography.jpg',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Halı & Kilim',
    slug: 'hali-kilim',
    description: 'El dokuma halılar ve özgün kilim koleksiyonları.',
    imageFileName: 'Handmade carpet making.jpg',
    sortOrder: 4,
    isCulturalAsset: true,
    children: [
      {
        name: 'El Dokuma Halı',
        slug: 'hali-kilim-el-dokuma-hali',
        description: 'Usta işi el dokuma halı seçenekleri.',
        imageFileName: 'Handmade carpet making.jpg',
        sortOrder: 1,
        isCulturalAsset: true,
      },
      {
        name: 'Vintage Kilim',
        slug: 'hali-kilim-vintage-kilim',
        description: 'Yaşı ve deseniyle öne çıkan vintage kilimler.',
        imageFileName: 'Antique Konya Kilim.jpg',
        sortOrder: 2,
        isCulturalAsset: true,
      },
      {
        name: 'Dekoratif Kilim',
        slug: 'hali-kilim-dekoratif-kilim',
        description: 'Yaşam alanlarına karakter katan dekoratif kilimler.',
        imageFileName: 'New Handmade Turkish Kilim.jpg',
        sortOrder: 3,
        isCulturalAsset: true,
      },
    ],
  },
  {
    name: 'Mücevher & Saat',
    slug: 'mucevher-saat',
    description: 'Değerli takılar ve saat koleksiyonları.',
    imageFileName: 'Handmade Gold Necklace.jpg',
    sortOrder: 5,
    children: [
      {
        name: 'Altın Takı',
        slug: 'mucevher-saat-altin-taki',
        description: 'Altın işçiliğiyle öne çıkan kolye ve takılar.',
        imageFileName: 'Gold necklace MET DP336810.jpg',
        sortOrder: 1,
      },
      {
        name: 'Gümüş Takı',
        slug: 'mucevher-saat-gumus-taki',
        description: 'Gümüş el işçiliği ve koleksiyonluk aksesuarlar.',
        imageFileName: 'Silver Jewelry.jpg',
        sortOrder: 2,
      },
      {
        name: 'Saat',
        slug: 'mucevher-saat-saat',
        description: 'Klasik ve modern kol saati seçenekleri.',
        imageFileName: 'Wrist Watch.jpg',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Mobilya & Dekor',
    slug: 'mobilya-dekor',
    description: 'Salon, yatak odası ve dış mekana uygun dekoratif mobilyalar.',
    imageFileName: 'Living room furniture (Unsplash).jpg',
    sortOrder: 6,
    children: [
      {
        name: 'Salon',
        slug: 'mobilya-dekor-salon',
        description: 'Oturma alanları için öne çıkan salon mobilyaları.',
        imageFileName: 'Couch-furniture-living-room-sofa (24300293356).jpg',
        sortOrder: 1,
      },
      {
        name: 'Yatak Odası',
        slug: 'mobilya-dekor-yatak-odasi',
        description: 'Yatak odası için işlevsel ve estetik mobilyalar.',
        imageFileName: 'Wooden bed.jpg',
        sortOrder: 2,
      },
      {
        name: 'Bahçe',
        slug: 'mobilya-dekor-bahce',
        description: 'Balkon ve bahçeye uygun dış mekan takımları.',
        imageFileName: 'Teak Garden Furniture Patio Set.jpg',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Kıyafet & Aksesuar',
    slug: 'kiyafet-aksesuar',
    description: 'Giyim ve tamamlayıcı aksesuar ürünleri.',
    imageFileName: 'Leather Handbags (4782040554).jpg',
    sortOrder: 7,
    children: [
      {
        name: 'Kadın Giyim',
        slug: 'kiyafet-aksesuar-kadin-giyim',
        description: 'Kadın giyim için öne çıkan seçkiler.',
        imageFileName: "Woman's Dress LACMA M.80.190.1a-c.jpg",
        sortOrder: 1,
      },
      {
        name: 'Erkek Giyim',
        slug: 'kiyafet-aksesuar-erkek-giyim',
        description: 'Erkek giyimde klasik ve modern parçalar.',
        imageFileName: "Man's suit jacket.jpg",
        sortOrder: 2,
      },
      {
        name: 'Çanta & Aksesuar',
        slug: 'kiyafet-aksesuar-canta-aksesuar',
        description: 'Günlük kullanım için çanta ve aksesuar seçenekleri.',
        imageFileName: 'A handbag.jpg',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Spor & Outdoor',
    slug: 'spor-outdoor',
    description: 'Fitness, kamp ve bisiklet odaklı outdoor ürünler.',
    imageFileName: 'Road cycling - riding a bike on the road.jpg',
    sortOrder: 8,
    children: [
      {
        name: 'Fitness',
        slug: 'spor-outdoor-fitness',
        description: 'Ağırlık ve kondisyon antrenmanına uygun ekipmanlar.',
        imageFileName: 'Lifting Dumbbell.jpg',
        sortOrder: 1,
      },
      {
        name: 'Kamp',
        slug: 'spor-outdoor-kamp',
        description: 'Doğa aktiviteleri için kamp ekipmanları.',
        imageFileName: 'Canvas camping tent.jpg',
        sortOrder: 2,
      },
      {
        name: 'Bisiklet',
        slug: 'spor-outdoor-bisiklet',
        description: 'Yol ve şehir kullanımına uygun bisiklet ürünleri.',
        imageFileName: 'Specialized road bike.JPG',
        sortOrder: 3,
      },
    ],
  },
  {
    name: 'Yöresel Ürünler',
    slug: 'yoresel-urunler',
    description: 'Yerel üreticilerden gelen hediyelik ve el emeği ürünler.',
    imageFileName: 'A souvenir shop.JPG',
    sortOrder: 9,
    children: [
      {
        name: 'Zeytinyağı',
        slug: 'yoresel-urunler-zeytinyagi',
        description: 'Bölgesel üretim zeytinyağı ve gurme ürünler.',
        imageFileName: 'Bottle of olive oil.jpg',
        sortOrder: 1,
      },
      {
        name: 'El Yapımı Seramik',
        slug: 'yoresel-urunler-el-yapimi-seramik',
        description: 'Atölye üretimi el yapımı seramik ürünler.',
        imageFileName: 'Budapest XII. Christmas Fair Handmade pottery.JPG',
        sortOrder: 2,
        isCulturalAsset: true,
      },
      {
        name: 'Hediyelik',
        slug: 'yoresel-urunler-hediyelik',
        description: 'Seyahat ve hatıra odaklı hediyelik seçenekleri.',
        imageFileName: 'A souvenir shop.JPG',
        sortOrder: 3,
      },
    ],
  },
];

@Injectable()
export class ProductService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Favorite)
    private readonly favoriteRepo: Repository<Favorite>,
    private readonly userService: UserService,
    @Inject(STORAGE_SERVICE)
    private readonly storage: IStorageService,
    @Optional()
    private readonly adsService?: AdsService,
    @Optional()
    private readonly trustService?: TrustService,
    @Optional()
    private readonly membershipService?: MembershipService,
  ) {}

  // ==========================================
  // Create Product
  // ==========================================

  async create(sellerId: string, dto: CreateProductDto) {
    const user = await this.userService.findById(sellerId);
    if (!user || !user.isSeller) {
      throw new ForbiddenException({
        code: RC.SELLER_REQUIRED,
        message: 'Sadece satıcılar ürün ekleyebilir',
      });
    }
    this.validateAskPriceCompatibility(dto.listingType, dto.askPriceEnabled);
    await this.validateLeafCategorySelection(dto.categoryId);
    const createData = this.stripClientImageUrl(dto);

    const product = this.productRepo.create({
      ...createData,
      sellerId,
      status: ProductStatus.DRAFT,
    });
    const saved = await this.productRepo.save(product);
    const full = await this.findProductResponse(saved.id);

    return { code: RC.PRODUCT_CREATED, message: 'Ürün oluşturuldu', ...full };
  }

  // ==========================================
  // Update Product
  // ==========================================

  async update(sellerId: string, productId: string, dto: UpdateProductDto) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['images'],
    });
    if (!product)
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Ürün bulunamadı',
      });
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException({
        code: RC.NOT_PRODUCT_OWNER,
        message: 'Bu ürün size ait değil',
      });
    }

    // CR-02: Type-safe field assignment — prevents mass assignment of sellerId, favoriteCount, etc.
    const {
      title,
      description,
      price,
      categoryId,
      stockQuantity,
      sku,
      geoIndicationCertNo,
      geoIndicationRegion,
      originCountry,
      originRegion,
      condition,
      listingType,
      dimensionWidth,
      dimensionHeight,
      dimensionDepth,
      weight,
      status,
      askPriceEnabled,
      askPriceMinAmount,
    } = dto;
    this.validateAskPriceCompatibility(
      listingType ?? product.listingType,
      askPriceEnabled ?? product.askPriceEnabled,
    );
    if (categoryId !== undefined) {
      await this.validateLeafCategorySelection(categoryId);
    }
    const safeUpdate = Object.fromEntries(
      Object.entries({
        title,
        description,
        price,
        categoryId,
        stockQuantity,
        sku,
        geoIndicationCertNo,
        geoIndicationRegion,
        originCountry,
        originRegion,
        condition,
        listingType,
        dimensionWidth,
        dimensionHeight,
        dimensionDepth,
        weight,
        status,
        askPriceEnabled,
        askPriceMinAmount,
      }).filter(([, v]) => v !== undefined),
    );
    Object.assign(product, safeUpdate);

    // K5: DRAFT→ACTIVE status geçiş guard'ı — yayınlama kalite kontrolü
    if (product.status === ProductStatus.ACTIVE) {
      const errors: string[] = [];
      const hasImage = (product.images?.length || 0) > 0;
      if (!hasImage) errors.push('En az 1 ürün görseli gereklidir');
      if (!product.description || product.description.trim().length < 10)
        errors.push('Ürün açıklaması en az 10 karakter olmalıdır');
      if (!product.categoryId) errors.push('Kategori seçimi zorunludur');
      if (product.price < 1) errors.push('Fiyat en az 1₺ olmalıdır');
      if (errors.length > 0) {
        throw new BadRequestException({
          code: RC.PRODUCT_ACTIVATION_FAILED,
          message: 'Ürün yayınlama gereksinimleri karşılanmıyor',
          errors,
        });
      }
    }

    await this.productRepo.save(product);

    const full = await this.findProductResponse(productId);
    return { code: RC.PRODUCT_UPDATED, message: 'Ürün güncellendi', ...full };
  }

  // ==========================================
  // Delete Product (soft)
  // ==========================================

  async remove(sellerId: string, productId: string) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product)
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Ürün bulunamadı',
      });
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException({
        code: RC.NOT_PRODUCT_OWNER,
        message: 'Bu ürün size ait değil',
      });
    }

    // BIZ-18: Block deletion if product has active/published auction
    const activeAuction = await this.productRepo.manager
      .createQueryBuilder('Auction', 'a')
      .where('a.productId = :productId', { productId })
      .andWhere('a.status IN (:...statuses)', {
        statuses: ['PUBLISHED', 'ACTIVE'],
      })
      .getOne();
    if (activeAuction) {
      throw new BadRequestException({
        code: RC.PRODUCT_IN_AUCTION,
        message: 'Bu ürün aktif bir müzayedede olduğu için silinemez',
      });
    }

    await this.productRepo.softDelete(productId);
    return { code: RC.PRODUCT_DELETED, message: 'Ürün silindi' };
  }

  // ==========================================
  // Image Upload
  // ==========================================

  async uploadImage(
    sellerId: string,
    productId: string,
    file: Express.Multer.File,
  ) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
      relations: ['images'],
    });
    if (!product)
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Ürün bulunamadı',
      });
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException({
        code: RC.NOT_PRODUCT_OWNER,
        message: 'Bu ürün size ait değil',
      });
    }

    const imageCount = product.images?.length || 0;
    if (imageCount >= MAX_IMAGES) {
      throw new BadRequestException({
        code: RC.MAX_IMAGES_REACHED,
        message: `Maksimum ${MAX_IMAGES} görsel yüklenebilir`,
      });
    }

    const url = await this.storage.upload(file, `products/${productId}`);
    const isPrimary = imageCount === 0;

    const image = this.imageRepo.create({
      productId,
      url,
      sortOrder: imageCount,
      isPrimary,
    });
    await this.imageRepo.save(image);

    // Keep imageUrl synced with primary
    if (isPrimary) {
      product.imageUrl = url;
      await this.productRepo.save(product);
    }

    return { code: RC.IMAGE_UPLOADED, message: 'Görsel yüklendi', image };
  }

  async deleteImage(sellerId: string, imageId: string) {
    const image = await this.imageRepo.findOne({
      where: { id: imageId },
      relations: ['product'],
    });
    if (!image)
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Görsel bulunamadı',
      });
    if (image.product.sellerId !== sellerId) {
      throw new ForbiddenException({
        code: RC.NOT_PRODUCT_OWNER,
        message: 'Bu ürün size ait değil',
      });
    }

    await this.storage.delete(image.url);
    // WR-04: Hard delete — physical file is already removed, soft delete would leave orphaned record
    await this.imageRepo.delete(imageId);

    // If primary was deleted, promote next image
    if (image.isPrimary) {
      const nextImage = await this.imageRepo.findOne({
        where: { productId: image.productId },
        order: { sortOrder: 'ASC' },
      });
      if (nextImage) {
        nextImage.isPrimary = true;
        await this.imageRepo.save(nextImage);
        await this.productRepo.update(image.productId, {
          imageUrl: nextImage.url,
        });
      } else {
        await this.productRepo.update(image.productId, { imageUrl: '' });
      }
    }

    return { code: RC.IMAGE_DELETED, message: 'Görsel silindi' };
  }

  // ==========================================
  // List — Public
  // ==========================================

  async findAll(page = 1, limit = 20, sort?: string) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.seller', 'seller')
      .leftJoinAndSelect('p.images', 'images')
      .where('p.status = :status', { status: ProductStatus.ACTIVE });

    if (sort === 'likes' || sort === 'popular') {
      qb.orderBy('p.favoriteCount', 'DESC').addOrderBy('p.createdAt', 'DESC');
    } else {
      qb.orderBy('p.createdAt', 'DESC');
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const responseItems = await this.applyMembershipVisibilityBoost(
      await this.annotateSponsoredProducts(
        await this.attachTrustBadges(items.map((p) => this.toResponse(p))),
        AdPlacementType.CATEGORY_SHOWCASE,
      ),
    );

    return {
      code: RC.PRODUCT_LIST,
      message: 'Ürünler listelendi',
      items: responseItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // My Products — Seller's own products
  // ==========================================

  async findMyProducts(sellerId: string, page = 1, limit = 20) {
    const [items, total] = await this.productRepo.findAndCount({
      where: { sellerId },
      relations: ['category', 'images'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      code: RC.PRODUCT_LIST,
      message: 'Satıcı ürünleri listelendi',
      items: await this.attachTrustBadges(
        items.map((p) => this.toResponse(p, undefined, true)),
      ),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==========================================
  // Find by ID
  // ==========================================

  async findById(id: string, userId?: string) {
    const productResponse = await this.findProductResponse(id, userId);
    return {
      code: RC.PRODUCT_FETCHED,
      message: 'Ürün getirildi',
      ...productResponse,
    };
  }

  async findPublicById(id: string) {
    const productResponse = await this.findProductResponse(
      id,
      undefined,
      ProductStatus.ACTIVE,
    );
    return {
      code: RC.PRODUCT_FETCHED,
      message: 'Ürün getirildi',
      ...productResponse,
    };
  }

  private async findProductResponse(
    id: string,
    userId?: string,
    status?: ProductStatus,
  ) {
    const product = await this.productRepo.findOne({
      where: status ? { id, status } : { id },
      relations: ['category', 'seller', 'images'],
    });
    if (!product)
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Ürün bulunamadı',
      });

    let isFavorited: boolean | undefined;
    if (userId) {
      const favorite = await this.favoriteRepo.findOne({
        where: { userId, productId: id },
        select: ['id'],
      });
      isFavorited = !!favorite;
    }

    const [response] = await this.applyMembershipVisibilityBoost(
      await this.annotateSponsoredProducts(
        await this.attachTrustBadges([
          this.toResponse(product, isFavorited, userId === product.sellerId),
        ]),
        AdPlacementType.CATEGORY_SHOWCASE,
        product.categoryId ?? undefined,
      ),
    );
    return response;
  }

  // ==========================================
  // Categories
  // ==========================================

  async findCategories() {
    const roots = await this.categoryRepo.find({
      where: { parentId: IsNull(), isActive: true },
      relations: ['children'],
      order: { sortOrder: 'ASC' },
    });

    return {
      code: RC.CATEGORY_LIST,
      message: 'Categories fetched',
      categories: roots.map((root) => ({
        ...root,
        children:
          root.children
            ?.filter((c) => c.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder) || [],
      })),
    };
  }

  async seedCategories() {
    for (const category of SEEDED_CATEGORIES) {
      const parent = await this.upsertSeedCategory(category);

      for (const child of category.children || []) {
        await this.upsertSeedCategory(child, parent.id);
      }
    }

    const result = await this.findCategories();
    return {
      code: RC.CATEGORY_SEEDED,
      message: 'Categories seeded',
      categories: result.categories,
    };
  }

  private async upsertSeedCategory(
    definition: SeedCategoryDefinition,
    parentId?: string,
  ) {
    const existing =
      (await this.categoryRepo.findOne({
        where: { slug: definition.slug },
      })) ||
      (await this.categoryRepo.findOne({
        where: { name: definition.name },
      }));

    return this.categoryRepo.save(
      this.categoryRepo.create({
        ...existing,
        ...(parentId ? { parentId } : {}),
        name: definition.name,
        slug: definition.slug,
        description: definition.description,
        imageUrl: this.buildSeedCategoryImageUrl(definition.imageFileName),
        sortOrder: definition.sortOrder,
        isActive: true,
        isCulturalAsset: definition.isCulturalAsset ?? false,
      }),
    );
  }

  private buildSeedCategoryImageUrl(fileName: string) {
    return `${COMMONS_FILE_PATH_BASE_URL}${encodeURIComponent(fileName)}`;
  }

  // ==========================================
  // Response Mapper
  // ==========================================

  private toResponse(
    product: Product,
    isFavorited?: boolean,
    revealAskPriceAmounts = false,
  ) {
    const hideAskPriceAmounts =
      product.askPriceEnabled && !revealAskPriceAmounts;
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: hideAskPriceAmounts ? null : Number(product.price),
      imageUrl: product.imageUrl,
      images:
        product.images?.map((img) => ({
          id: img.id,
          url: img.url,
          sortOrder: img.sortOrder,
          isPrimary: img.isPrimary,
        })) || [],
      status: product.status,
      sellerId: product.sellerId,
      sellerName: product.seller
        ? `${product.seller.firstName || ''} ${product.seller.lastName || ''}`.trim()
        : null,
      categoryId: product.categoryId,
      categoryName: product.category?.name || null,
      // Phase 3 fields
      stockQuantity: product.stockQuantity,
      sku: product.sku,
      geoIndicationCertNo: product.geoIndicationCertNo,
      geoIndicationRegion: product.geoIndicationRegion,
      originCountry: product.originCountry,
      originRegion: product.originRegion,
      condition: product.condition,
      listingType: product.listingType,
      listingMode: product.askPriceEnabled ? 'ASK_PRICE' : product.listingType,
      orderSource: product.askPriceEnabled ? 'ASK_PRICE' : product.listingType,
      askPriceEnabled: product.askPriceEnabled,
      askPriceMinAmount:
        product.askPriceMinAmount && !hideAskPriceAmounts
          ? Number(product.askPriceMinAmount)
          : null,
      isAskPriceCompatible: this.isAskPriceCompatible(product),
      dimensionWidth: product.dimensionWidth
        ? Number(product.dimensionWidth)
        : null,
      dimensionHeight: product.dimensionHeight
        ? Number(product.dimensionHeight)
        : null,
      dimensionDepth: product.dimensionDepth
        ? Number(product.dimensionDepth)
        : null,
      weight: product.weight ? Number(product.weight) : null,
      favoriteCount: product.favoriteCount,
      ...(isFavorited !== undefined ? { isFavorited } : {}),
      createdAt: product.createdAt,
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

  private async attachTrustBadges<T extends { sellerId?: string | null }>(
    items: T[],
  ) {
    const trustService = this.trustService;
    if (!trustService) return items;

    return Promise.all(
      items.map(async (item) => {
        if (!item.sellerId) return item;
        return {
          ...item,
          trustBadge: await trustService.getSellerTrustBadge(item.sellerId),
        };
      }),
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

  isAskPriceCompatible(
    product: Pick<Product, 'listingType' | 'askPriceEnabled'>,
  ): boolean {
    return (
      product.askPriceEnabled === true &&
      product.listingType !== ListingType.AUCTION
    );
  }

  private validateAskPriceCompatibility(
    listingType?: ListingType,
    askPriceEnabled?: boolean,
  ) {
    if (askPriceEnabled === true && listingType === ListingType.AUCTION) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Auction products cannot enable Ask Price',
      });
    }
  }

  private async validateLeafCategorySelection(categoryId?: string) {
    if (!categoryId) return;

    const category = await this.categoryRepo.findOne({
      where: { id: categoryId, isActive: true },
    });
    if (!category) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Geçersiz kategori seçimi',
      });
    }

    const hasActiveChildren = await this.categoryRepo.exist({
      where: { parentId: categoryId, isActive: true },
    });
    if (hasActiveChildren) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Lütfen alt kategori seçin',
      });
    }
  }

  private stripClientImageUrl<T extends object>(dto: T): Omit<T, 'imageUrl'> {
    const { imageUrl: _clientImageUrl, ...safeDto } = dto as T & {
      imageUrl?: string;
    };
    return safeDto;
  }
}
