import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { VariantNumber } from './entities/variant-number.entity';
import { ProductVariantSku } from './entities/product-variant-sku.entity';
import { Favorite } from '../search/entities/favorite.entity';
import { ProductService } from './product.service';
import { ProductController, CategoryController } from './product.controller';
import { DevProductBrandSeedService } from './dev-product-brand-seed.service';
import { UserModule } from '../user/user.module';
import { AdsModule } from '../ads/ads.module';
import { TrustModule } from '../trust/trust.module';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductImage,
      Category,
      Brand,
      VariantNumber,
      ProductVariantSku,
      Favorite,
    ]),
    UserModule,
    AdsModule,
    TrustModule,
    MembershipModule,
  ],
  controllers: [ProductController, CategoryController],
  providers: [ProductService, DevProductBrandSeedService],
  exports: [ProductService],
})
export class ProductModule {}
