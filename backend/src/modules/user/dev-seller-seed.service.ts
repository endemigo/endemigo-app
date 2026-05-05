import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { SellerStatus } from './entities/seller-profile.entity';
import { SellerProfile } from './entities/seller-profile.entity';
import { User } from './entities/user.entity';

@Injectable()
export class DevSellerSeedService implements OnModuleInit {
  private readonly logger = new Logger(DevSellerSeedService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SellerProfile)
    private readonly sellerProfileRepo: Repository<SellerProfile>,
  ) {}

  async onModuleInit() {
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    if (nodeEnv && nodeEnv !== 'development') {
      return;
    }

    const email = this.configService.get<string>('DEV_SELLER_EMAIL')?.trim().toLowerCase() || 'a@a.com';
    const password = this.configService.get<string>('DEV_SELLER_PASSWORD') || '123123';
    const firstName = this.configService.get<string>('DEV_SELLER_FIRST_NAME') || 'Ahmet';
    const lastName = this.configService.get<string>('DEV_SELLER_LAST_NAME') || 'Aydın';
    const businessName = this.configService.get<string>('DEV_SELLER_BUSINESS_NAME') || 'A&A Onaylı Satıcı';

    const passwordHash = await bcrypt.hash(password, 12);
    const existingUser = await this.userRepo.findOne({
      where: { email },
      relations: ['sellerProfile'],
    });

    if (!existingUser) {
      const user = await this.userRepo.save(
        this.userRepo.create({
          email,
          passwordHash,
          firstName,
          lastName,
          isSeller: true,
          isVerified: true,
          isActive: true,
        }),
      );

      await this.sellerProfileRepo.save(
        this.sellerProfileRepo.create({
          userId: user.id,
          businessName,
          status: SellerStatus.APPROVED,
          approvedAt: new Date(),
          agreementAcceptedAt: new Date(),
          agreementVersion: '1.0.0',
          commissionRate: 0.15,
        }),
      );

      this.logger.log(`Development seller created for ${email}`);
      return;
    }

    existingUser.passwordHash = passwordHash;
    existingUser.firstName = firstName;
    existingUser.lastName = lastName;
    existingUser.isSeller = true;
    existingUser.isVerified = true;
    existingUser.isActive = true;
    await this.userRepo.save(existingUser);

    const sellerProfile = existingUser.sellerProfile
      ? await this.sellerProfileRepo.findOne({ where: { userId: existingUser.id } })
      : null;

    if (!sellerProfile) {
      await this.sellerProfileRepo.save(
        this.sellerProfileRepo.create({
          userId: existingUser.id,
          businessName,
          status: SellerStatus.APPROVED,
          approvedAt: new Date(),
          agreementAcceptedAt: new Date(),
          agreementVersion: '1.0.0',
          commissionRate: 0.15,
        }),
      );
    } else {
      sellerProfile.businessName = businessName;
      sellerProfile.status = SellerStatus.APPROVED;
      sellerProfile.approvedAt = new Date();
      sellerProfile.agreementAcceptedAt = sellerProfile.agreementAcceptedAt || new Date();
      sellerProfile.agreementVersion = sellerProfile.agreementVersion || '1.0.0';
      sellerProfile.commissionRate = sellerProfile.commissionRate ?? 0.15;
      await this.sellerProfileRepo.save(sellerProfile);
    }

    this.logger.log(`Development seller refreshed for ${email}`);
  }
}
