import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  AuctionPaymentStatus,
  ListingType,
  ProductStatus,
  RC,
} from '@endemigo/shared';
import { IsNull } from 'typeorm';
import { CartService } from './cart.service';

describe('CartService', () => {
  const buildService = () => {
    const cartRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((input: Record<string, unknown>) => ({
        id: 'cart-1',
        ...input,
      })),
      save: jest.fn(async (input: unknown) => input),
      remove: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
      manager: {
        findOne: jest.fn().mockResolvedValue(null),
      },
    };
    const productRepo = {
      findOne: jest.fn(),
    };
    const variantNumberRepo = {
      findOne: jest.fn(),
    };
    const productVariantSkuRepo = {
      findOne: jest.fn(),
    };

    const service = new CartService(
      cartRepo as never,
      productRepo as never,
      variantNumberRepo as never,
      productVariantSkuRepo as never,
    );

    return {
      service,
      cartRepo,
      productRepo,
      variantNumberRepo,
      productVariantSkuRepo,
    };
  };

  it('adds a cart item when product exists', async () => {
    const { service, cartRepo, productRepo } = buildService();
    productRepo.findOne.mockResolvedValue({ id: 'product-1', price: 100 });
    cartRepo.findOne.mockResolvedValueOnce(null);
    cartRepo.find.mockResolvedValueOnce([
      {
        id: 'cart-1',
        userId: 'user-1',
        productId: 'product-1',
        productVariantSkuId: null,
        variantNumberId: null,
        quantity: 2,
      },
    ]);

    const result = await service.addItem('user-1', {
      productId: 'product-1',
      quantity: 2,
    });

    expect(cartRepo.findOne).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        productId: 'product-1',
        productVariantSkuId: IsNull(),
        variantNumberId: IsNull(),
        offerId: IsNull(),
      },
    });
    expect(result.code).toBe(RC.CART_ITEM_ADDED);
    expect(result.cart.totalQuantity).toBe(2);
  });

  it('throws not found when product does not exist', async () => {
    const { service, productRepo } = buildService();
    productRepo.findOne.mockResolvedValue(null);

    await expect(
      service.addItem('user-1', { productId: 'missing-product' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('clears cart items for user', async () => {
    const { service, cartRepo } = buildService();

    const result = await service.clearCart('user-1');

    expect(cartRepo.delete).toHaveBeenCalledWith({
      userId: 'user-1',
      auctionId: IsNull(),
      offerId: IsNull(),
    });
    expect(result.code).toBe(RC.CART_CLEARED);
    expect(result.cart.itemCount).toBe(0);
  });

  it('clears all cart items when forced', async () => {
    const { service, cartRepo } = buildService();

    const result = await service.clearCart('user-1', true);

    expect(cartRepo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(result.code).toBe(RC.CART_CLEARED);
  });

  it('blocks updating quantity of won auction items', async () => {
    const { service, cartRepo } = buildService();
    cartRepo.findOne.mockResolvedValue({
      id: 'item-1',
      userId: 'user-1',
      auctionId: 'auction-1',
      quantity: 1,
    });

    await expect(
      service.updateItem('user-1', 'item-1', { quantity: 2 }),
    ).rejects.toThrow('Kazanılan müzayede ürünlerinin adedi güncellenemez');
  });

  it('blocks removing won auction items from cart', async () => {
    const { service, cartRepo } = buildService();
    cartRepo.findOne.mockResolvedValue({
      id: 'item-1',
      userId: 'user-1',
      auctionId: 'auction-1',
      quantity: 1,
    });

    await expect(service.removeItem('user-1', 'item-1')).rejects.toThrow(
      'Kazanılan müzayede ürünleri sepetten çıkarılamaz',
    );
  });

  it('adds a negotiated item at the offer price', async () => {
    const { service, cartRepo, productRepo } = buildService();
    productRepo.findOne.mockResolvedValue({
      id: 'product-1',
      price: null,
      status: ProductStatus.ACTIVE,
    });
    cartRepo.findOne.mockResolvedValueOnce(null);
    cartRepo.find.mockResolvedValueOnce([]);

    const result = await service.addNegotiatedItem('user-1', {
      productId: 'product-1',
      offerId: 'offer-1',
      amount: 250,
    });

    expect(cartRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        productId: 'product-1',
        offerId: 'offer-1',
        customPrice: 250,
        quantity: 1,
      }),
    );
    expect(result.code).toBe(RC.CART_ITEM_ADDED);
  });

  it('blocks updating quantity of negotiated items', async () => {
    const { service, cartRepo } = buildService();
    cartRepo.findOne.mockResolvedValue({
      id: 'item-1',
      userId: 'user-1',
      auctionId: null,
      offerId: 'offer-1',
      quantity: 1,
    });

    await expect(
      service.updateItem('user-1', 'item-1', { quantity: 2 }),
    ).rejects.toThrow('Teklifle eklenen ürünün adedi güncellenemez');
  });

  it('blocks removing negotiated items from cart', async () => {
    const { service, cartRepo } = buildService();
    cartRepo.findOne.mockResolvedValue({
      id: 'item-1',
      userId: 'user-1',
      auctionId: null,
      offerId: 'offer-1',
      quantity: 1,
    });

    await expect(service.removeItem('user-1', 'item-1')).rejects.toThrow(
      'Kabul edilen teklif ürünü sepetten çıkarılamaz',
    );
  });

  it('blocks adding auction-listing products to cart', async () => {
    const { service, productRepo } = buildService();
    productRepo.findOne.mockResolvedValue({
      id: 'product-1',
      price: 100,
      listingType: ListingType.AUCTION,
      status: ProductStatus.ACTIVE,
    });

    await expect(
      service.addItem('user-1', { productId: 'product-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('blocks adding UNDER_AUCTION products to cart', async () => {
    const { service, productRepo } = buildService();
    productRepo.findOne.mockResolvedValue({
      id: 'product-1',
      price: 100,
      listingType: ListingType.DIRECT_SALE,
      status: ProductStatus.UNDER_AUCTION,
    });

    await expect(
      service.addItem('user-1', { productId: 'product-1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects auction cart item when auction does not match product', async () => {
    const { service, cartRepo, productRepo } = buildService();
    productRepo.findOne.mockResolvedValue({ id: 'product-1', price: 100 });
    cartRepo.manager.findOne.mockResolvedValue(null);

    await expect(
      service.addItem('user-1', {
        productId: 'product-1',
        auctionId: 'auction-1',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects auction cart item when user is not the winner', async () => {
    const { service, cartRepo, productRepo } = buildService();
    productRepo.findOne.mockResolvedValue({ id: 'product-1', price: 100 });
    cartRepo.manager.findOne.mockResolvedValue({
      id: 'auction-1',
      productId: 'product-1',
      winnerId: 'other-user',
      winnerPaymentStatus: AuctionPaymentStatus.PENDING,
      currentPrice: 500,
    });

    await expect(
      service.addItem('user-1', {
        productId: 'product-1',
        auctionId: 'auction-1',
        customPrice: 1,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('uses server-side final price for won auctions, ignoring client customPrice', async () => {
    const { service, cartRepo, productRepo } = buildService();
    productRepo.findOne.mockResolvedValue({ id: 'product-1', price: 100 });
    cartRepo.manager.findOne.mockResolvedValue({
      id: 'auction-1',
      productId: 'product-1',
      winnerId: 'user-1',
      winnerPaymentStatus: AuctionPaymentStatus.PENDING,
      currentPrice: 750,
    });
    cartRepo.findOne.mockResolvedValueOnce(null);
    cartRepo.find.mockResolvedValueOnce([]);

    const result = await service.addItem('user-1', {
      productId: 'product-1',
      auctionId: 'auction-1',
      customPrice: 1,
    });

    expect(cartRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        auctionId: 'auction-1',
        customPrice: 750,
        quantity: 1,
      }),
    );
    expect(result.code).toBe(RC.CART_ITEM_ADDED);
  });
});
