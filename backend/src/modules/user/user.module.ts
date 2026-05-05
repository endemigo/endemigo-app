import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { SellerProfile } from './entities/seller-profile.entity';
import { KvkkConsent } from './entities/kvkk-consent.entity';
import { Address } from './entities/address.entity';
import { Product } from '../product/entities/product.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { TrustModule } from '../trust/trust.module';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { SellerController } from './seller.controller';
import { DevSellerSeedService } from './dev-seller-seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, SellerProfile, KvkkConsent, Address, RefreshToken, Product]),
    TrustModule,
  ],
  controllers: [UserController, SellerController],
  providers: [UserService, DevSellerSeedService],
  exports: [UserService],
})
export class UserModule {}
