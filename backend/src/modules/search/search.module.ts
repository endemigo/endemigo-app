import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../product/entities/product.entity';
import { Auction } from '../auction/entities/auction.entity';
import { Favorite } from './entities/favorite.entity';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { AdsModule } from '../ads/ads.module';
import { MembershipModule } from '../membership/membership.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Auction, Favorite]),
    AdsModule,
    MembershipModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
