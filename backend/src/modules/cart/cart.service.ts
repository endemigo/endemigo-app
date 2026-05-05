import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminRole } from '@endemigo/shared';
import { Product } from '../product/entities/product.entity';
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
  ) {}

  async getMyCart(userId: string) {
    const items = await this.getUserCartItems(userId);
    return {
      code: RC.CART_FETCHED,
      message: 'Sepet getirildi',
      cart: this.toCartResponse(items),
    };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const quantity = dto.quantity ?? 1;
    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException({ code: RC.PRODUCT_NOT_FOUND, message: 'Ürün bulunamadı' });
    }

    let item = await this.cartRepo.findOne({ where: { userId, productId: dto.productId } });
    if (item) {
      item.quantity = Math.min(99, item.quantity + quantity);
    } else {
      item = this.cartRepo.create({ userId, productId: dto.productId, quantity });
    }
    await this.cartRepo.save(item);

    const items = await this.getUserCartItems(userId);
    return {
      code: RC.CART_ITEM_ADDED,
      message: 'Ürün sepete eklendi',
      cart: this.toCartResponse(items),
    };
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const item = await this.cartRepo.findOne({ where: { id: itemId, userId } });
    if (!item) {
      throw new NotFoundException({ code: RC.NOT_FOUND, message: 'Sepet ürünü bulunamadı' });
    }
    item.quantity = dto.quantity;
    await this.cartRepo.save(item);

    const items = await this.getUserCartItems(userId);
    return {
      code: RC.CART_ITEM_UPDATED,
      message: 'Sepet güncellendi',
      cart: this.toCartResponse(items),
    };
  }

  async removeItem(userId: string, itemId: string) {
    const item = await this.cartRepo.findOne({ where: { id: itemId, userId } });
    if (!item) {
      throw new NotFoundException({ code: RC.NOT_FOUND, message: 'Sepet ürünü bulunamadı' });
    }

    await this.cartRepo.remove(item);
    const items = await this.getUserCartItems(userId);
    return {
      code: RC.CART_ITEM_REMOVED,
      message: 'Ürün sepetten kaldırıldı',
      cart: this.toCartResponse(items),
    };
  }

  async clearCart(userId: string) {
    await this.cartRepo.delete({ userId });
    return {
      code: RC.CART_CLEARED,
      message: 'Sepet temizlendi',
      cart: this.toCartResponse([]),
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
        .andWhere(from ? 'ci.createdAt >= :from' : '1=1', { from: from ? new Date(from) : undefined })
        .andWhere(to ? 'ci.createdAt <= :to' : '1=1', { to: to ? new Date(to) : undefined })
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
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  private toCartResponse(items: CartItem[]) {
    return {
      itemCount: items.length,
      totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
      items: items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        addedAt: item.createdAt,
        updatedAt: item.updatedAt,
        product: item.product
          ? {
              id: item.product.id,
              title: item.product.title,
              price: item.product.price,
              imageUrl: item.product.imageUrl,
              sellerId: item.product.sellerId,
            }
          : null,
      })),
    };
  }
}
