import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, In } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductDraft } from './entities/product-draft.entity';
import { ProductImage } from './entities/product-image.entity';
import { Category } from './entities/category.entity';
import { VariantNumber } from './entities/variant-number.entity';
import { ProductVariantSku } from './entities/product-variant-sku.entity';
import { Favorite } from '../search/entities/favorite.entity';
import { ListingTemplate as ListingTemplateEntity } from './entities/listing-template.entity';
import { GeoIndication } from './entities/geo-indication.entity';
import { FeatureBadge } from './entities/feature-badge.entity';
import { CreateProductDto, ProductVariantSkuInputDto } from './dto/create-product.dto';
import { CreateListingDraftDto, UpdateListingDraftDto } from './dto/listing-draft.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UserService } from '../user/user.service';
import { ProductStatus } from '../../shared/types/product-status.enum';
import { ListingType } from '../../shared/types/listing-type.enum';
import { ListingDraftEntryMode } from '../../shared/types/listing-draft-entry-mode.enum';
import { ListingDraftStatus } from '../../shared/types/listing-draft-status.enum';
import { RC } from '../../shared/constants/response-codes';
import { STORAGE_SERVICE } from '../../shared/storage/storage.interface';
import type { IStorageService } from '../../shared/storage/storage.interface';
import {
  AdPlacementType,
  DEFAULT_PRODUCT_IMAGE_UPLOAD_LIMITS,
  VariantOptionKind,
  type ProductImageUploadLimits,
  TrustBadgeLevel,
} from '@endemigo/shared';
import { AdsService } from '../ads/ads.service';
import { AdminSettingsService } from '../admin-settings/admin-settings.service';
import { TrustService } from '../trust/trust.service';
import { MembershipService } from '../membership/membership.service';
import { OrderReview } from '../order/entities/order-review.entity';

const COMMONS_FILE_PATH_BASE_URL =
  'https://commons.wikimedia.org/wiki/Special:FilePath/';

type SeedCategoryDefinition = {
  name: string;
  slug: string;
  description: string;
  imageFileName: string;
  sortOrder: number;
  isCulturalAsset?: boolean;
  metadata?: Record<string, unknown>;
  children?: SeedCategoryDefinition[];
};

interface ListingTemplateField {
  key: string;
  type: 'text' | 'number' | 'price' | 'select' | 'multiSelect' | 'boolean' | 'date' | 'dimension' | 'image';
  required: boolean;
  optionSource?: string;
}

interface ListingTemplate {
  fields: ListingTemplateField[];
  variant: {
    enabled: boolean;
    allowedKinds: VariantOptionKind[];
    requiredKinds: VariantOptionKind[];
    maxGroups: number;
  };
}

type SerializedCategory = Omit<Category, 'children'> & {
  listingTemplate: ListingTemplate;
  children: SerializedCategory[];
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
    @InjectRepository(ProductDraft)
    private readonly draftRepo: Repository<ProductDraft>,
    @InjectRepository(ProductImage)
    private readonly imageRepo: Repository<ProductImage>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(VariantNumber)
    private readonly variantNumberRepo: Repository<VariantNumber>,
    @InjectRepository(ProductVariantSku)
    private readonly productVariantSkuRepo: Repository<ProductVariantSku>,
    @InjectRepository(Favorite)
    private readonly favoriteRepo: Repository<Favorite>,
    @InjectRepository(ListingTemplateEntity)
    private readonly listingTemplateRepo: Repository<ListingTemplateEntity>,
    @InjectRepository(GeoIndication)
    private readonly geoIndicationRepo: Repository<GeoIndication>,
    @InjectRepository(FeatureBadge)
    private readonly featureBadgeRepo: Repository<FeatureBadge>,
    private readonly userService: UserService,
    @Inject(STORAGE_SERVICE)
    private readonly storage: IStorageService,
    @Optional()
    private readonly adsService?: AdsService,
    @Optional()
    private readonly trustService?: TrustService,
    @Optional()
    private readonly membershipService?: MembershipService,
    @Optional()
    private readonly adminSettingsService?: AdminSettingsService,
    @Optional()
    @InjectRepository(OrderReview)
    private readonly orderReviewRepo?: Repository<OrderReview>,
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
    const { variantSkus, ...createData } = this.stripClientImageUrl(dto);
    const normalizedGeoTypes =
      createData.geoIndicationTypes && createData.geoIndicationTypes.length > 0
        ? createData.geoIndicationTypes
        : createData.geoIndicationType
          ? [createData.geoIndicationType]
          : [];

    const product = this.productRepo.create({
      ...createData,
      geoIndicationTypes: normalizedGeoTypes,
      geoIndicationType: normalizedGeoTypes[0] ?? createData.geoIndicationType ?? null,
      sellerId,
      status: ProductStatus.DRAFT,
    });
    const saved = await this.productRepo.save(product);
    await this.syncProductVariantSkus(saved.id, variantSkus);
    const full = await this.findProductResponse(saved.id);

    return { code: RC.PRODUCT_CREATED, message: 'Ürün oluşturuldu', ...full };
  }

  async createListingDraft(sellerId: string, dto: CreateListingDraftDto) {
    await this.assertSellerCanManageListings(sellerId);
    const draft = await this.draftRepo.save(
      this.draftRepo.create({
        sellerId,
        entryMode: dto.entryMode,
        listingType: dto.listingType,
        categoryId: dto.categoryId ?? null,
        currentStep: dto.currentStep,
        payload: dto.payload,
        status: ListingDraftStatus.DRAFT,
        productId: null,
      }),
    );

    return {
      code: RC.LISTING_DRAFT_CREATED,
      message: 'İlan taslağı oluşturuldu',
      draft,
    };
  }

  async listListingDrafts(sellerId: string) {
    await this.assertSellerCanManageListings(sellerId);
    const drafts = await this.draftRepo.find({
      where: { sellerId, status: ListingDraftStatus.DRAFT },
      order: { updatedAt: 'DESC' },
    });

    return {
      code: RC.LISTING_DRAFT_LISTED,
      message: 'İlan taslakları getirildi',
      drafts,
    };
  }

  async getListingDraft(sellerId: string, draftId: string) {
    const draft = await this.findListingDraftForSeller(sellerId, draftId);
    return {
      code: RC.LISTING_DRAFT_FETCHED,
      message: 'İlan taslağı getirildi',
      draft,
    };
  }

  async updateListingDraft(
    sellerId: string,
    draftId: string,
    dto: UpdateListingDraftDto,
  ) {
    const draft = await this.findListingDraftForSeller(sellerId, draftId);
    if (dto.entryMode !== undefined) draft.entryMode = dto.entryMode;
    if (dto.listingType !== undefined) draft.listingType = dto.listingType;
    if (dto.categoryId !== undefined) draft.categoryId = dto.categoryId;
    if (dto.currentStep !== undefined) draft.currentStep = dto.currentStep;
    if (dto.payload !== undefined) draft.payload = dto.payload;
    const saved = await this.draftRepo.save(draft);

    return {
      code: RC.LISTING_DRAFT_UPDATED,
      message: 'İlan taslağı güncellendi',
      draft: saved,
    };
  }

  async deleteListingDraft(sellerId: string, draftId: string) {
    const draft = await this.findListingDraftForSeller(sellerId, draftId);
    draft.status = ListingDraftStatus.DELETED;
    await this.draftRepo.save(draft);
    await this.draftRepo.softDelete(draftId);

    return {
      code: RC.LISTING_DRAFT_DELETED,
      message: 'İlan taslağı silindi',
    };
  }

  async publishListingDraft(sellerId: string, draftId: string) {
    const draft = await this.findListingDraftForSeller(sellerId, draftId);
    const payload = this.resolveDraftProductPayload(draft);
    const productResult = await this.create(sellerId, payload);
    draft.status = ListingDraftStatus.PUBLISHED;
    draft.productId = productResult.id;
    const saved = await this.draftRepo.save(draft);

    return {
      code: RC.LISTING_DRAFT_PUBLISHED,
      message: 'İlan taslağı yayına hazır ürüne dönüştürüldü',
      draft: saved,
      product: productResult,
    };
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
      barcodeNo,
      productContent,
      sellerNotes,
      brand,
      isEndemigoBrandCandidate,
      geoIndicationCertNo,
      geoIndicationRegion,
      geoIndicationReceivedAt,
      geoIndicationType,
      geoIndicationTypes,
      originCountry,
      originRegion,
      productionProvince,
      productionDistrict,
      productionSeason,
      productionSeasons,
      salesMonths,
      condition,
      listingType,
      wholesalePrice,
      retailPrice,
      shippingProvince,
      shippingDistrict,
      shippingAddress,
      deliveryTemplateDomestic,
      deliveryTemplateInternational,
      desiDomestic,
      desiInternational,
      featureBadges,
      geoBadgeSelections,
      additionalCertificates,
      dimensionWidth,
      dimensionHeight,
      dimensionDepth,
      weight,
      status,
      askPriceEnabled,
      askPriceMinAmount,
      variantSkus,
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
        barcodeNo,
        productContent,
        sellerNotes,
        brand,
        isEndemigoBrandCandidate,
        geoIndicationCertNo,
        geoIndicationRegion,
        geoIndicationReceivedAt,
        geoIndicationType,
        geoIndicationTypes,
        originCountry,
        originRegion,
        productionProvince,
        productionDistrict,
        productionSeason,
        productionSeasons,
        salesMonths,
        condition,
        listingType,
        wholesalePrice,
        retailPrice,
        shippingProvince,
        shippingDistrict,
        shippingAddress,
        deliveryTemplateDomestic,
        deliveryTemplateInternational,
        desiDomestic,
        desiInternational,
        featureBadges,
        geoBadgeSelections,
        additionalCertificates,
        dimensionWidth,
        dimensionHeight,
        dimensionDepth,
        weight,
        status,
        askPriceEnabled,
        askPriceMinAmount,
      }).filter(([, v]) => v !== undefined),
    );
    const nextGeoTypes = geoIndicationTypes ?? (geoIndicationType ? [geoIndicationType] : undefined);
    if (nextGeoTypes !== undefined) {
      safeUpdate.geoIndicationTypes = nextGeoTypes;
      safeUpdate.geoIndicationType = nextGeoTypes[0] ?? null;
    }
    Object.assign(product, safeUpdate);

    // K5: DRAFT→ACTIVE status geçiş guard'ı — yayınlama kalite kontrolü
    if (product.status === ProductStatus.ACTIVE) {
      const imageUploadLimits = await this.getProductImageUploadLimits();
      const errors: string[] = [];
      const imageCount = product.images?.length || 0;
      if (imageCount < imageUploadLimits.min) {
        errors.push(`En az ${imageUploadLimits.min} ürün görseli gereklidir`);
      }
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

      // Güvenilirlik kontrolü — Güvenilmeyen satıcının ürünü onay sürecine gider
      if (this.trustService) {
        const trustBadge = await this.trustService.getSellerTrustBadge(sellerId);
        const isTrusted =
          trustBadge.level === TrustBadgeLevel.TRUSTED ||
          trustBadge.level === TrustBadgeLevel.HIGHLY_TRUSTED;

        if (!isTrusted) {
          product.status = ProductStatus.PENDING_REVIEW;
        }
      }
    }

    await this.productRepo.save(product);
    await this.syncProductVariantSkus(productId, variantSkus);

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

    const imageUploadLimits = await this.getProductImageUploadLimits();
    const imageCount = product.images?.length || 0;
    if (imageCount >= imageUploadLimits.max) {
      throw new BadRequestException({
        code: RC.MAX_IMAGES_REACHED,
        message: `Maksimum ${imageUploadLimits.max} görsel yüklenebilir`,
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

  private async getProductImageUploadLimits(): Promise<ProductImageUploadLimits> {
    if (!this.adminSettingsService) {
      return DEFAULT_PRODUCT_IMAGE_UPLOAD_LIMITS;
    }

    return this.adminSettingsService.getProductImageUploadLimits();
  }

  // ==========================================
  // List — Public
  // ==========================================

  async findAll(page = 1, limit = 20, sort?: string, brand?: string) {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'category')
      .leftJoinAndSelect('p.seller', 'seller')
      .leftJoinAndSelect('p.images', 'images')
      .where('p.status = :status', { status: ProductStatus.ACTIVE });

    const normalizedBrand = brand?.trim();
    if (normalizedBrand) {
      qb.andWhere('LOWER(p.brand) = LOWER(:brand)', { brand: normalizedBrand });
    }

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

  async getProductReviews(id: string) {
    const product = await this.productRepo.findOne({
      where: { id },
      select: ['id'],
    });
    if (!product) {
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Ürün bulunamadı',
      });
    }

    const reviewSummary = await this.buildProductReviewSummary(id);
    return {
      code: RC.PRODUCT_FETCHED,
      message: 'Ürün yorumları getirildi',
      ...reviewSummary,
    };
  }

  private async findProductResponse(
    id: string,
    userId?: string,
    status?: ProductStatus,
  ) {
    const product = await this.productRepo.findOne({
      where: status ? { id, status } : { id },
      relations: [
        'category',
        'seller',
        'images',
        'variantSkus',
        'variantSkus.colorVariantNumber',
        'variantSkus.sizeVariantNumber',
      ],
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
    const reviewSummary = await this.buildProductReviewSummary(product.id);
    return {
      ...response,
      ...reviewSummary,
    };
  }

  // ==========================================
  // Categories
  // ==========================================

  async findCategories() {
    const templates = await this.listingTemplateRepo.find();
    const templateMap = new Map<string, ListingTemplateEntity>(
      templates.map((t) => [t.id, t]),
    );

    const roots = await this.categoryRepo.find({
      where: { parentId: IsNull(), isActive: true },
      relations: ['children'],
      order: { sortOrder: 'ASC' },
    });

    return {
      code: RC.CATEGORY_LIST,
      message: 'Categories fetched',
      categories: roots.map((root) => this.serializeCategory(root, templateMap)),
    };
  }

  async findGeoIndications() {
    const items = await this.geoIndicationRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return {
      code: RC.SUCCESS,
      message: 'Geo indications fetched',
      geoIndications: items,
    };
  }

  async findFeatureBadges() {
    const items = await this.featureBadgeRepo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return {
      code: RC.SUCCESS,
      message: 'Feature badges fetched',
      features: items,
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
        metadata: definition.metadata ?? this.buildListingTemplateMetadata(definition.slug),
      }),
    );
  }

  private buildSeedCategoryImageUrl(fileName: string) {
    return `${COMMONS_FILE_PATH_BASE_URL}${encodeURIComponent(fileName)}`;
  }

  private serializeCategory(category: Category, templateMap?: Map<string, ListingTemplateEntity>): SerializedCategory {
    const metadata = category.metadata ?? {};
    let listingTemplate = this.extractListingTemplate(metadata);

    if (metadata?.templateId && templateMap) {
      const template = templateMap.get(metadata.templateId as string);
      if (template) {
        listingTemplate = {
          fields: template.fields ?? [],
          variant: template.variant ?? { enabled: false, allowedKinds: [], requiredKinds: [], maxGroups: 0 }
        } as any;
      }
    }

    if (!listingTemplate) {
      listingTemplate = this.buildListingTemplate(category.slug ?? '');
    }

    return {
      ...category,
      listingTemplate,
      children:
        category.children
          ?.filter((child) => child.isActive)
          .sort((left, right) => left.sortOrder - right.sortOrder)
          .map((child) => this.serializeCategory(child, templateMap)) || [],
    };
  }

  private buildListingTemplateMetadata(slug: string): Record<string, unknown> {
    return {
      listingTemplate: this.buildListingTemplate(slug),
    };
  }

  private extractListingTemplate(metadata: Record<string, unknown>): ListingTemplate | null {
    const template = metadata.listingTemplate;
    if (!template || typeof template !== 'object' || Array.isArray(template)) {
      return null;
    }
    return template as ListingTemplate;
  }

  private buildListingTemplate(slug: string): ListingTemplate {
    if (this.isFoodCategory(slug)) {
      return {
        fields: [
          { key: 'productContent', type: 'text', required: true },
          { key: 'productionProvince', type: 'select', required: true, optionSource: 'turkishProvinces' },
          { key: 'weight', type: 'number', required: false },
          { key: 'additionalCertificates', type: 'text', required: false },
          { key: 'images', type: 'image', required: true },
        ],
        variant: {
          enabled: false,
          allowedKinds: [],
          requiredKinds: [],
          maxGroups: 0,
        },
      };
    }

    if (slug.includes('hali') || slug.includes('kilim') || slug.includes('mobilya')) {
      return {
        fields: [
          { key: 'material', type: 'text', required: false },
          { key: 'dimensionWidth', type: 'dimension', required: true },
          { key: 'dimensionHeight', type: 'dimension', required: true },
          { key: 'condition', type: 'select', required: true },
          { key: 'images', type: 'image', required: true },
        ],
        variant: {
          enabled: true,
          allowedKinds: [VariantOptionKind.COLOR, VariantOptionKind.SIZE],
          requiredKinds: [],
          maxGroups: 2,
        },
      };
    }

    if (slug.includes('tekstil') || slug.includes('ayakkabi')) {
      return {
        fields: [
          { key: 'brand', type: 'text', required: false },
          { key: 'condition', type: 'select', required: true },
          { key: 'images', type: 'image', required: true },
        ],
        variant: {
          enabled: true,
          allowedKinds: [VariantOptionKind.COLOR, VariantOptionKind.SIZE, VariantOptionKind.NUMBER],
          requiredKinds: slug.includes('ayakkabi') ? [VariantOptionKind.NUMBER] : [VariantOptionKind.SIZE],
          maxGroups: 2,
        },
      };
    }

    return {
      fields: [
        { key: 'brand', type: 'text', required: false },
        { key: 'condition', type: 'select', required: true },
        { key: 'sku', type: 'text', required: false },
        { key: 'images', type: 'image', required: true },
      ],
      variant: {
        enabled: false,
        allowedKinds: [],
        requiredKinds: [],
        maxGroups: 0,
      },
    };
  }

  private isFoodCategory(slug: string) {
    return [
      'gida',
      'yoresel',
      'zeytin',
      'bal',
      'kurutulmus',
      'kahve',
      'cay',
    ].some((keyword) => slug.includes(keyword));
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
    const activeVariantSkus = (product.variantSkus ?? [])
      .filter((item) => item.isActive !== false)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const variantOptions = this.buildVariantOptionsFromSkus(activeVariantSkus);
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
      barcodeNo: product.barcodeNo,
      productContent: product.productContent,
      sellerNotes: product.sellerNotes,
      brand: product.brand,
      isEndemigoBrandCandidate: product.isEndemigoBrandCandidate,
      geoIndicationCertNo: product.geoIndicationCertNo,
      geoIndicationRegion: product.geoIndicationRegion,
      geoIndicationReceivedAt: product.geoIndicationReceivedAt,
      geoIndicationType: product.geoIndicationType,
      geoIndicationTypes: product.geoIndicationTypes || [],
      originCountry: product.originCountry,
      originRegion: product.originRegion,
      productionProvince: product.productionProvince,
      productionDistrict: product.productionDistrict,
      productionSeason: product.productionSeason,
      productionSeasons: product.productionSeasons || [],
      salesMonths: product.salesMonths || [],
      condition: product.condition,
      listingType: product.listingType,
      listingMode: product.askPriceEnabled ? 'ASK_PRICE' : product.listingType,
      orderSource: product.askPriceEnabled ? 'ASK_PRICE' : product.listingType,
      askPriceEnabled: product.askPriceEnabled,
      // Minimum teklif public olarak görünmeli; buyer teklif validasyonunu bununla yapıyor.
      askPriceMinAmount: product.askPriceMinAmount
        ? Number(product.askPriceMinAmount)
        : null,
      wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
      retailPrice: product.retailPrice ? Number(product.retailPrice) : null,
      shippingProvince: product.shippingProvince,
      shippingDistrict: product.shippingDistrict,
      shippingAddress: product.shippingAddress,
      additionalCertificates: product.additionalCertificates,
      variantOptions,
      variantSkus: activeVariantSkus.map((item) => ({
        id: item.id,
        colorVariantNumberId: item.colorVariantNumberId,
        sizeVariantNumberId: item.sizeVariantNumberId,
        colorVariant: item.colorVariantNumber
          ? {
              id: item.colorVariantNumber.id,
              kind: item.colorVariantNumber.kind,
              nameTr: item.colorVariantNumber.nameTr,
              nameEn: item.colorVariantNumber.nameEn,
              swatchHex: item.colorVariantNumber.swatchHex,
            }
          : null,
        sizeVariant: item.sizeVariantNumber
          ? {
              id: item.sizeVariantNumber.id,
              kind: item.sizeVariantNumber.kind,
              nameTr: item.sizeVariantNumber.nameTr,
              nameEn: item.sizeVariantNumber.nameEn,
              swatchHex: item.sizeVariantNumber.swatchHex,
            }
          : null,
        skuCode: item.skuCode,
        stockQuantity: item.stockQuantity,
        priceOverride: item.priceOverride ? Number(item.priceOverride) : null,
        imageUrl: item.imageUrl,
        isActive: item.isActive,
      })),
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

  private async buildProductReviewSummary(productId: string) {
    const reviews =
      this.orderReviewRepo && 'find' in this.orderReviewRepo
        ? await this.orderReviewRepo.find({
            where: { productId },
            order: { createdAt: 'DESC' },
          })
        : [];

    const mappedReviews = reviews
      .filter((review) => review.productComment || review.productRating)
      .map((review) => ({
        id: review.id,
        orderId: review.orderId,
        buyerId: review.buyerId,
        rating: review.productRating,
        comment: review.productComment,
        createdAt: review.createdAt,
      }));
    const reviewCount = mappedReviews.length;
    const rating =
      reviewCount > 0
        ? Number(
            (
              mappedReviews.reduce((total, review) => total + review.rating, 0) /
              reviewCount
            ).toFixed(1),
          )
        : 0;

    return {
      rating,
      reviewCount,
      latestReviewComment: mappedReviews[0]?.comment ?? null,
      reviews: mappedReviews,
    };
  }

  private buildVariantOptionsFromSkus(skus: ProductVariantSku[]) {
    const optionMap = new Map<
      string,
      {
        id: string;
        label: string;
        kind: VariantOptionKind;
        swatchHex: string | null;
        imageUrl: string | null;
        inStock: boolean;
        stockQuantity: number;
      }
    >();

    skus.forEach((sku) => {
      const stock = Number(sku.stockQuantity ?? 0);
      const variants = [
        { variant: sku.colorVariantNumber, fallbackKind: VariantOptionKind.COLOR as VariantOptionKind },
        { variant: sku.sizeVariantNumber, fallbackKind: VariantOptionKind.SIZE as VariantOptionKind },
      ];
      variants.forEach(({ variant, fallbackKind }) => {
        if (!variant?.id) return;
        const existing = optionMap.get(variant.id);
        const nextStock = (existing?.stockQuantity ?? 0) + Math.max(0, stock);
        optionMap.set(variant.id, {
          id: variant.id,
          label: variant.nameTr || variant.nameEn,
          kind: variant.kind ?? fallbackKind,
          swatchHex: variant.swatchHex ?? null,
          imageUrl: existing?.imageUrl ?? sku.imageUrl ?? null,
          inStock: (existing?.inStock ?? false) || stock > 0,
          stockQuantity: nextStock,
        });
      });
    });

    return [...optionMap.values()].sort((left, right) => {
      if (left.kind === right.kind) return left.label.localeCompare(right.label, 'tr');
      if (left.kind === VariantOptionKind.COLOR) return -1;
      if (right.kind === VariantOptionKind.COLOR) return 1;
      return left.label.localeCompare(right.label, 'tr');
    });
  }

  private async syncProductVariantSkus(
    productId: string,
    variantSkus?: ProductVariantSkuInputDto[],
  ) {
    if (variantSkus === undefined) return;

    if (variantSkus.length === 0) {
      await this.productVariantSkuRepo.delete({ productId });
      return;
    }

    const variantIds = [...new Set(
      variantSkus.flatMap((item) => [
        item.colorVariantNumberId,
        item.sizeVariantNumberId,
      ].filter((id): id is string => Boolean(id))),
    )];
    const variants = variantIds.length > 0
      ? await this.variantNumberRepo.find({ where: { id: In(variantIds) } })
      : [];
    const variantMap = new Map(variants.map((item) => [item.id, item]));

    const normalized = variantSkus.map((item, index) => {
      const colorVariantNumberId = item.colorVariantNumberId ?? null;
      const sizeVariantNumberId = item.sizeVariantNumberId ?? null;
      if (!colorVariantNumberId && !sizeVariantNumberId) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Varyant kombinasyonunda en az bir seçenek zorunludur',
        });
      }
      if (colorVariantNumberId) {
        const colorVariant = variantMap.get(colorVariantNumberId);
        if (!colorVariant || colorVariant.kind !== VariantOptionKind.COLOR) {
          throw new BadRequestException({
            code: RC.VALIDATION_ERROR,
            message: 'Geçersiz renk varyantı',
          });
        }
      }
      if (sizeVariantNumberId) {
        const sizeVariant = variantMap.get(sizeVariantNumberId);
        if (!sizeVariant || sizeVariant.kind === VariantOptionKind.COLOR) {
          throw new BadRequestException({
            code: RC.VALIDATION_ERROR,
            message: 'Geçersiz beden/numara varyantı',
          });
        }
      }
      return {
        productId,
        colorVariantNumberId,
        sizeVariantNumberId,
        skuCode: item.skuCode?.trim() || null,
        stockQuantity: Math.max(0, item.stockQuantity ?? 0),
        priceOverride: item.priceOverride ?? null,
        imageUrl: item.imageUrl?.trim() || null,
        isActive: item.isActive ?? true,
        sortOrder: item.sortOrder ?? index,
      };
    });

    const duplicateGuard = new Set<string>();
    normalized.forEach((item) => {
      const key = `${item.colorVariantNumberId ?? '_'}:${item.sizeVariantNumberId ?? '_'}`;
      if (duplicateGuard.has(key)) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Aynı varyant kombinasyonu birden fazla kez gönderildi',
        });
      }
      duplicateGuard.add(key);
    });

    await this.productVariantSkuRepo.delete({ productId });
    await this.productVariantSkuRepo.save(
      normalized.map((item) => this.productVariantSkuRepo.create(item)),
    );
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

  private async assertSellerCanManageListings(sellerId: string) {
    const user = await this.userService.findById(sellerId);
    if (!user || !user.isSeller) {
      throw new ForbiddenException({
        code: RC.SELLER_REQUIRED,
        message: 'Sadece satıcılar ürün ekleyebilir',
      });
    }
  }

  private async findListingDraftForSeller(sellerId: string, draftId: string) {
    const draft = await this.draftRepo.findOne({
      where: {
        id: draftId,
        sellerId,
        status: ListingDraftStatus.DRAFT,
      },
    });
    if (!draft) {
      throw new NotFoundException({
        code: RC.LISTING_DRAFT_NOT_FOUND,
        message: 'İlan taslağı bulunamadı',
      });
    }
    return draft;
  }

  private resolveDraftProductPayload(draft: ProductDraft): CreateProductDto {
    const nestedProduct = draft.payload.product;
    const payload =
      nestedProduct && typeof nestedProduct === 'object' && !Array.isArray(nestedProduct)
        ? (nestedProduct as Record<string, unknown>)
        : draft.payload;
    const title = typeof payload.title === 'string' ? payload.title : '';
    const price = Number(payload.price);
    if (title.trim().length < 3 || !Number.isFinite(price) || price <= 0) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Taslak yayınlamak için başlık ve fiyat zorunludur',
      });
    }

    return {
      ...(payload as Partial<CreateProductDto>),
      title,
      price,
      categoryId:
        typeof payload.categoryId === 'string'
          ? payload.categoryId
          : draft.categoryId ?? undefined,
      listingType: draft.listingType,
    } as CreateProductDto;
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
