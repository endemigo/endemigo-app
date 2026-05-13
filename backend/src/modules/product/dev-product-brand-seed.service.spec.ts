import { ConfigService } from '@nestjs/config';
import { DevProductBrandSeedService } from './dev-product-brand-seed.service';

describe('DevProductBrandSeedService', () => {
  it('skips seeding outside development', async () => {
    const configService = {
      get: jest.fn().mockReturnValue('production'),
    } as unknown as ConfigService;
    const productRepo = {
      createQueryBuilder: jest.fn(),
      save: jest.fn(),
    };
    const brandRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const service = new DevProductBrandSeedService(
      configService,
      productRepo as never,
      brandRepo as never,
    );
    await service.onModuleInit();

    expect(brandRepo.findOne).not.toHaveBeenCalled();
    expect(productRepo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('seeds missing brands and assigns random brand to blank products in development', async () => {
    const configService = {
      get: jest.fn().mockReturnValue('development'),
    } as unknown as ConfigService;
    const productRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 'p-1', brand: '' },
          { id: 'p-2', brand: null },
        ]),
      }),
      save: jest.fn(async (input: unknown) => input),
    };
    const brandRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((input: unknown) => input),
      save: jest.fn(async (input: unknown) => input),
    };

    const service = new DevProductBrandSeedService(
      configService,
      productRepo as never,
      brandRepo as never,
    );
    await service.onModuleInit();

    expect(brandRepo.save).toHaveBeenCalledTimes(3);
    expect(productRepo.save).toHaveBeenCalledTimes(1);
  });
});
