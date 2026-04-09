import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { SellerProfile } from './entities/seller-profile.entity';
import { KvkkConsent } from './entities/kvkk-consent.entity';
import { Address } from './entities/address.entity';
import { UserService } from './user.service';
import { UserController } from './user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, SellerProfile, KvkkConsent, Address])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
