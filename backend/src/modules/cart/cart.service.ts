import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import {
  AdminRole,
  AuctionPaymentStatus,
  ListingType,
  ProductStatus,
} from '@endemigo/shared';
import { Auction } from '../auction/entities/auction.entity';
import { Product } from '../product/entities/product.entity';
import { VariantNumber } from '../product/entities/variant-number.entity';
import { ProductVariantSku } from '../product/entities/product-variant-sku.entity';
import { User } from '../user/entities/user.entity';
import { RC } from '../../shared/constants/response-codes';
import { CartItem } from './entities/cart-item.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { AdminCartQueryDto } from './dto/admin-cart-query.dto';

interface AdminUser {
  id: string;
  roles: AdminRole[];
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private readonly cartRepo: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(VariantNumber)
    private readonly variantNumberRepo: Repository<VariantNumber>,
    @InjectRepository(ProductVariantSku)
    private readonly productVariantSkuRepo: Repository<ProductVariantSku>,
  ) {}

  async getMyCart(userId: string) {
    const items = await this.getUserCartItems(userId);
    const currencies = await this.resolveItemCurrencies(items);
    return {
      code: RC.CART_FETCHED,
      message: 'Sepet getirildi',
      cart: this.toCartResponse(items, currencies),
    };
  }

  /** Müzayede kalemleri event para biriminde tahsil edilir; diğerleri TRY. */
  private async resolveItemCurrencies(
    items: CartItem[],
  ): Promise<Map<string, string>> {
    const currencies = new Map<string, string>();
    const auctionIds = [
      ...new Set(
        items.map((i) => i.auctionId).filter((id): id is string => !!id),
      ),
    ];
    if (auctionIds.length === 0) return currencies;
    const auctions = await this.cartRepo.manager.find(Auction, {
      where: { id: In(auctionIds) },
      relations: ['event'],
    });
    for (const auction of auctions) {
      currencies.set(auction.id, auction.event?.currency ?? 'TRY');
    }
    return currencies;
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const quantity = dto.quantity ?? 1;
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Ürün bulunamadı',
      });
    }

    // Müzayede ürünü sabit fiyatla satılamaz. Kazanılan lot ise yalnızca
    // gerçek kazanan ekleyebilir ve fiyat sunucudaki nihai fiyattan gelir —
    // istemcinin gönderdiği customPrice asla kullanılmaz (checkout bu alanı
    // ödeme tutarı olarak okuyor).
    let wonAuctionPrice: number | null = null;
    if (dto.auctionId) {
      const auction = await this.cartRepo.manager.findOne(Auction, {
        where: { id: dto.auctionId },
      });
      if (!auction || auction.productId !== dto.productId) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Müzayede bilgisi doğrulanamadı',
        });
      }
      if (
        auction.winnerId !== userId ||
        auction.winnerPaymentStatus !== AuctionPaymentStatus.PENDING
      ) {
        throw new ForbiddenException({
          code: RC.FORBIDDEN,
          message: 'Bu müzayede için ödeme yetkiniz yok',
        });
      }
      wonAuctionPrice = Number(auction.currentPrice);
    } else if (
      product.listingType === ListingType.AUCTION ||
      product.status === ProductStatus.UNDER_AUCTION
    ) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Müzayede ürünleri sepete eklenemez',
      });
    }

    let variantNumberId = dto.variantId ?? null;
    const productVariantSkuId = dto.productVariantSkuId ?? null;

    if (productVariantSkuId) {
      const sku = await this.productVariantSkuRepo.findOne({
        where: { id: productVariantSkuId },
      });
      if (!sku || sku.productId !== dto.productId || sku.isActive === false) {
        throw new NotFoundException({
          code: RC.NOT_FOUND,
          message: 'Varyant kombinasyonu bulunamadı',
        });
      }
      if (!dto.auctionId && sku.stockQuantity < quantity) {
        throw new BadRequestException({
          code: RC.PRODUCT_OUT_OF_STOCK,
          message: 'Seçilen varyant için yeterli stok yok',
        });
      }
      variantNumberId =
        sku.sizeVariantNumberId ?? sku.colorVariantNumberId ?? variantNumberId;
    } else if (!dto.auctionId && product.stockQuantity < quantity) {
      // Kesin kontrol checkout'ta atomik yapılır; burada erken uyarı verilir.
      throw new BadRequestException({
        code: RC.PRODUCT_OUT_OF_STOCK,
        message: 'Ürün için yeterli stok yok',
      });
    }

    if (variantNumberId) {
      const variant = await this.variantNumberRepo.findOne({
        where: { id: variantNumberId },
      });
      if (!variant) {
        throw new NotFoundException({
          code: RC.NOT_FOUND,
          message: 'Varyant bulunamadı',
        });
      }
    }

    let item = await this.cartRepo.findOne({
      where: {
        userId,
        productId: dto.productId,
        productVariantSkuId: productVariantSkuId ?? IsNull(),
        variantNumberId: variantNumberId ?? IsNull(),
        // Pazarlıklı (teklif fiyatlı) kalemler normal ekleme ile birleşmez.
        offerId: IsNull(),
      },
    });
    if (item) {
      if (dto.auctionId) {
        item.auctionId = dto.auctionId;
        item.customPrice = wonAuctionPrice;
        item.quantity = 1;
      } else {
        item.quantity = Math.min(99, item.quantity + quantity);
      }
    } else {
      item = this.cartRepo.create({
        userId,
        productId: dto.productId,
        productVariantSkuId,
        variantNumberId,
        auctionId: dto.auctionId ?? null,
        customPrice: wonAuctionPrice,
        quantity: dto.auctionId ? 1 : quantity,
      });
    }
    await this.cartRepo.save(item);

    const items = await this.getUserCartItems(userId);
    return {
      code: RC.CART_ITEM_ADDED,
      message: 'Ürün sepete eklendi',
      cart: this.toCartResponse(items, await this.resolveItemCurrencies(items)),
    };
  }

  /**
   * Fiyat-sor akışı: kabul edilen teklif, teklif tutarı customPrice olarak
   * alıcının sepetine girer. Tutar sunucudaki Offer kaydından gelir —
   * istemciden asla alınmaz. offerId üzerinden idempotenttir.
   */
  async addNegotiatedItem(
    userId: string,
    input: { productId: string; offerId: string; amount: number },
  ) {
    const product = await this.productRepo.findOne({
      where: { id: input.productId },
    });
    if (!product) {
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Ürün bulunamadı',
      });
    }
    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Ürün satışta değil',
      });
    }
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Teklif tutarı geçersiz',
      });
    }

    let item = await this.cartRepo.findOne({
      where: { userId, offerId: input.offerId },
    });
    if (!item) {
      item = this.cartRepo.create({
        userId,
        productId: input.productId,
        productVariantSkuId: null,
        variantNumberId: null,
        auctionId: null,
        offerId: input.offerId,
        customPrice: amount,
        quantity: 1,
      });
    } else {
      item.customPrice = amount;
      item.quantity = 1;
    }
    await this.cartRepo.save(item);

    const items = await this.getUserCartItems(userId);
    return {
      code: RC.CART_ITEM_ADDED,
      message: 'Ürün teklif fiyatıyla sepete eklendi',
      cart: this.toCartResponse(items, await this.resolveItemCurrencies(items)),
    };
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const item = await this.cartRepo.findOne({ where: { id: itemId, userId } });
    if (!item) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Sepet ürünü bulunamadı',
      });
    }
    if (item.auctionId) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Kazanılan müzayede ürünlerinin adedi güncellenemez',
      });
    }
    if (item.offerId) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Teklifle eklenen ürünün adedi güncellenemez',
      });
    }
    item.quantity = dto.quantity;
    await this.cartRepo.save(item);

    const items = await this.getUserCartItems(userId);
    return {
      code: RC.CART_ITEM_UPDATED,
      message: 'Sepet güncellendi',
      cart: this.toCartResponse(items, await this.resolveItemCurrencies(items)),
    };
  }

  async removeItem(userId: string, itemId: string) {
    const item = await this.cartRepo.findOne({ where: { id: itemId, userId } });
    if (!item) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Sepet ürünü bulunamadı',
      });
    }
    if (item.auctionId) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Kazanılan müzayede ürünleri sepetten çıkarılamaz',
      });
    }
    if (item.offerId) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Kabul edilen teklif ürünü sepetten çıkarılamaz',
      });
    }

    await this.cartRepo.remove(item);
    const items = await this.getUserCartItems(userId);
    return {
      code: RC.CART_ITEM_REMOVED,
      message: 'Ürün sepetten kaldırıldı',
      cart: this.toCartResponse(items, await this.resolveItemCurrencies(items)),
    };
  }

  async clearCart(userId: string, force = false) {
    if (force) {
      await this.cartRepo.delete({ userId });
    } else {
      await this.cartRepo.delete({
        userId,
        auctionId: IsNull(),
        offerId: IsNull(),
      });
    }
    const items = await this.getUserCartItems(userId);
    return {
      code: RC.CART_CLEARED,
      message: 'Sepet temizlendi',
      cart: this.toCartResponse(items, await this.resolveItemCurrencies(items)),
    };
  }

  async listAdminCarts(query: AdminCartQueryDto, adminUser: AdminUser) {
    const { userId, from, to } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.cartRepo
      .createQueryBuilder('ci')
      .leftJoin(User, 'u', 'u.id = ci.userId')
      .select('ci.userId', 'userId')
      .addSelect('u.email', 'email')
      .addSelect('u.firstName', 'firstName')
      .addSelect('u.lastName', 'lastName')
      .addSelect('COUNT(ci.id)', 'itemCount')
      .addSelect('COALESCE(SUM(ci.quantity), 0)', 'totalQuantity')
      .addSelect('MAX(ci.createdAt)', 'lastAddedAt')
      .groupBy('ci.userId')
      .addGroupBy('u.email')
      .addGroupBy('u.firstName')
      .addGroupBy('u.lastName')
      .orderBy('MAX(ci.createdAt)', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (userId) qb.andWhere('ci.userId = :userId', { userId });
    if (from) qb.andWhere('ci.createdAt >= :from', { from: new Date(from) });
    if (to) qb.andWhere('ci.createdAt <= :to', { to: new Date(to) });

    const [rows, total] = await Promise.all([
      qb.getRawMany<{
        userId: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        itemCount: string;
        totalQuantity: string;
        lastAddedAt: string;
      }>(),
      this.cartRepo
        .createQueryBuilder('ci')
        .select('COUNT(DISTINCT ci.userId)', 'total')
        .where(userId ? 'ci.userId = :userId' : '1=1', { userId })
        .andWhere(from ? 'ci.createdAt >= :from' : '1=1', {
          from: from ? new Date(from) : undefined,
        })
        .andWhere(to ? 'ci.createdAt <= :to' : '1=1', {
          to: to ? new Date(to) : undefined,
        })
        .getRawOne<{ total: string }>(),
    ]);

    return {
      code: RC.ADMIN_CARTS_FETCHED,
      message: 'Sepetler getirildi',
      adminUserId: adminUser.id,
      items: rows.map((row) => ({
        userId: row.userId,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        itemCount: Number(row.itemCount),
        totalQuantity: Number(row.totalQuantity),
        lastAddedAt: row.lastAddedAt,
      })),
      pagination: {
        page,
        limit,
        total: Number(total?.total ?? 0),
      },
    };
  }

  async listAdminCartItems(query: AdminCartQueryDto, adminUser: AdminUser) {
    const { userId, from, to } = query;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.cartRepo
      .createQueryBuilder('ci')
      .leftJoinAndSelect('ci.product', 'product')
      .leftJoinAndSelect('ci.variantNumber', 'variantNumber')
      .leftJoinAndSelect('ci.productVariantSku', 'productVariantSku')
      .leftJoinAndSelect('ci.user', 'user')
      .orderBy('ci.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (userId) qb.andWhere('ci.userId = :userId', { userId });
    if (from) qb.andWhere('ci.createdAt >= :from', { from: new Date(from) });
    if (to) qb.andWhere('ci.createdAt <= :to', { to: new Date(to) });

    const [items, total] = await qb.getManyAndCount();

    return {
      code: RC.ADMIN_CART_ITEMS_FETCHED,
      message: 'Sepet kalemleri getirildi',
      adminUserId: adminUser.id,
      items: items.map((item) => ({
        id: item.id,
        userId: item.userId,
        email: item.user?.email,
        productId: item.productId,
        productVariantSkuId: item.productVariantSkuId,
        variantId: item.variantNumberId,
        variantLabel: item.variantNumber?.nameTr ?? null,
        skuCode: item.productVariantSku?.skuCode ?? null,
        productTitle: item.product?.title,
        quantity: item.quantity,
        price: item.product?.price,
        imageUrl: item.product?.imageUrl,
        addedAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  private async getUserCartItems(userId: string) {
    return this.cartRepo.find({
      where: { userId },
      relations: ['product', 'variantNumber', 'productVariantSku'],
      order: { createdAt: 'DESC' },
    });
  }

  private toCartResponse(items: CartItem[], currencies?: Map<string, string>) {
    return {
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productVariantSkuId: item.productVariantSkuId,
        variantId: item.variantNumberId,
        auctionId: item.auctionId,
        currency: (item.auctionId && currencies?.get(item.auctionId)) || 'TRY',
        offerId: item.offerId,
        customPrice:
          item.customPrice !== null && item.customPrice !== undefined
            ? Number(item.customPrice)
            : null,
        variant: item.variantNumber
          ? {
              id: item.variantNumber.id,
              kind: item.variantNumber.kind,
              nameTr: item.variantNumber.nameTr,
              nameEn: item.variantNumber.nameEn,
              swatchHex: item.variantNumber.swatchHex,
            }
          : null,
        productVariantSku: item.productVariantSku
          ? {
              id: item.productVariantSku.id,
              colorVariantNumberId: item.productVariantSku.colorVariantNumberId,
              sizeVariantNumberId: item.productVariantSku.sizeVariantNumberId,
              skuCode: item.productVariantSku.skuCode,
            }
          : null,
        quantity: item.quantity,
        addedAt: item.createdAt,
        updatedAt: item.updatedAt,
        product: item.product
          ? {
              id: item.product.id,
              title: item.product.title,
              price:
                item.customPrice !== null && item.customPrice !== undefined
                  ? Number(item.customPrice)
                  : item.product.price,
              imageUrl: item.product.imageUrl,
              sellerId: item.product.sellerId,
            }
          : null,
      })),
    };
  }
}
