import { ValidationPipe } from '@nestjs/common';
import { AdminProductActionDto } from './admin-product-action.dto';

describe('AdminProductActionDto contract', () => {
  const pipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  });

  it('accepts typed metadata for admin product actions', async () => {
    const payload = {
      reason: 'Admin ürün formu oluşturma',
      metadata: {
        sellerId: 'seller-1',
        title: 'Test ürün',
        price: 1233.5,
        stockQuantity: 5,
        originCountry: 'TR',
        salesMonths: [1, 3, 5],
        wholesalePrice: 1000,
        retailPrice: 1500,
        askPriceEnabled: true,
      },
    };

    await expect(
      pipe.transform(payload, {
        type: 'body',
        metatype: AdminProductActionDto,
      }),
    ).resolves.toBeDefined();
  });

  it('rejects legacy salesMonths csv string and unknown metadata fields', async () => {
    const payload = {
      reason: 'Admin ürün formu güncelleme',
      metadata: {
        title: 'Test ürün',
        price: 500,
        salesMonths: '1,2,3',
        unknownField: 'forbidden',
      },
    };

    await expect(
      pipe.transform(payload, {
        type: 'body',
        metatype: AdminProductActionDto,
      }),
    ).rejects.toBeDefined();
  });
});
