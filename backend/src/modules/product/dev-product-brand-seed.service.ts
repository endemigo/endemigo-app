import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { Product } from './entities/product.entity';

const DEV_BRANDS = [
  { name: 'Endemigo Select', slug: 'endemigo-select' },
  { name: 'Anatolia Pure', slug: 'anatolia-pure' },
  { name: 'Ege Harvest', slug: 'ege-harvest' },
] as const;

@Injectable()
export class DevProductBrandSeedService implements OnModuleInit {
  private readonly logger = new Logger(DevProductBrandSeedService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
  ) {}

  async onModuleInit() {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv && nodeEnv !== 'development') {
      return;
    }

    await this.ensureBrands();
    await this.assignMissingProductBrands();
  }

  private async ensureBrands() {
    for (const brand of DEV_BRANDS) {
      const exists = await this.brandRepo.findOne({
        where: [{ name: brand.name }, { slug: brand.slug }],
      });
      if (exists) continue;
      await this.brandRepo.save(
        this.brandRepo.create({
          name: brand.name,
          slug: brand.slug,
          isActive: true,
        }),
      );
    }
  }

  private async assignMissingProductBrands() {
    const products = await this.productRepo
      .createQueryBuilder('p')
      .where(`COALESCE(TRIM(p.brand), '') = ''`)
      .getMany();

    if (!products.length) {
      return;
    }

    products.forEach((product) => {
      product.brand = this.pickRandomBrandName();
    });

    await this.productRepo.save(products);
    this.logger.log(`Assigned random brands to ${products.length} product(s)`);
  }

  private pickRandomBrandName() {
    const randomIndex = Math.floor(Math.random() * DEV_BRANDS.length);
    return DEV_BRANDS[randomIndex].name;
  }
}
