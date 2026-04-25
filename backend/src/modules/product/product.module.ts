import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductImage } from './entities/product-image.entity';
import { Category } from './entities/category.entity';
import { Favorite } from '../search/entities/favorite.entity';
import { ProductService } from './product.service';
import { ProductController, CategoryController } from './product.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductImage, Category, Favorite]),
    UserModule,
  ],
  controllers: [ProductController, CategoryController],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
