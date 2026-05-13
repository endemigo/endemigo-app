import { NotFoundException } from '@nestjs/common';
import { RC } from '@endemigo/shared';
import { IsNull } from 'typeorm';
import { CartService } from './cart.service';

describe('CartService', () => {
  const buildService = () => {
    const cartRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((input: Record<string, unknown>) => ({ id: 'cart-1', ...input })),
      save: jest.fn(async (input: unknown) => input),
      remove: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
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

    expect(cartRepo.delete).toHaveBeenCalledWith({ userId: 'user-1' });
    expect(result.code).toBe(RC.CART_CLEARED);
    expect(result.cart.itemCount).toBe(0);
  });
});
