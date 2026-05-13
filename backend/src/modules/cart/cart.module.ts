import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { Product } from '../product/entities/product.entity';
import { VariantNumber } from '../product/entities/variant-number.entity';
import { ProductVariantSku } from '../product/entities/product-variant-sku.entity';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartItem } from './entities/cart-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CartItem, Product, VariantNumber, ProductVariantSku]),
    AdminAuthModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
