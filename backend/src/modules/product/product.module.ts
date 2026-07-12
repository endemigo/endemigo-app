import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminSettingsModule } from '../admin-settings/admin-settings.module';
import { Product } from './entities/product.entity';
import { ProductDraft } from './entities/product-draft.entity';
import { ProductImage } from './entities/product-image.entity';
import { Category } from './entities/category.entity';
import { Brand } from './entities/brand.entity';
import { VariantNumber } from './entities/variant-number.entity';
import { ProductVariantSku } from './entities/product-variant-sku.entity';
import { ProductView } from './entities/product-view.entity';
import { Favorite } from '../search/entities/favorite.entity';
import { ProductService } from './product.service';
import { ProductController, CategoryController } from './product.controller';
import { DevProductBrandSeedService } from './dev-product-brand-seed.service';
import { AiGeneratorService } from './ai-generator.service';
import { UserModule } from '../user/user.module';
import { AdsModule } from '../ads/ads.module';
import { TrustModule } from '../trust/trust.module';
import { MembershipModule } from '../membership/membership.module';
import { OrderReview } from '../order/entities/order-review.entity';
import { ListingTemplate } from './entities/listing-template.entity';
import { GeoIndication } from './entities/geo-indication.entity';
import { FeatureBadge } from './entities/feature-badge.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductDraft,
      ProductImage,
      Category,
      Brand,
      VariantNumber,
      ProductVariantSku,
      ProductView,
      Favorite,
      OrderReview,
      ListingTemplate,
      GeoIndication,
      FeatureBadge,
    ]),
    AdminSettingsModule,
    UserModule,
    AdsModule,
    TrustModule,
    MembershipModule,
  ],
  controllers: [ProductController, CategoryController],
  providers: [ProductService, DevProductBrandSeedService, AiGeneratorService],
  exports: [ProductService, AiGeneratorService],
})
export class ProductModule {}
