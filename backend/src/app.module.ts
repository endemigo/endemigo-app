import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ServeStaticModule } from '@nestjs/serve-static';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { join } from 'path';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { HealthModule } from './modules/health/health.module';
import { ProductModule } from './modules/product/product.module';
import { AuctionModule } from './modules/auction/auction.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { SearchModule } from './modules/search/search.module';
import { CartModule } from './modules/cart/cart.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { PaymentModule } from './modules/payment/payment.module';
import { OrderModule } from './modules/order/order.module';
import { CargoModule } from './modules/cargo/cargo.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AdminAuthModule } from './modules/admin-auth/admin-auth.module';
import { AdminAuditModule } from './modules/admin-audit/admin-audit.module';
import { AdminSettingsModule } from './modules/admin-settings/admin-settings.module';
import { AdminOperationsModule } from './modules/admin-operations/admin-operations.module';
import { AdsModule } from './modules/ads/ads.module';
import { CampaignModule } from './modules/campaign/campaign.module';
import { MembershipModule } from './modules/membership/membership.module';
import { NegotiationModule } from './modules/negotiation/negotiation.module';
import { TrustModule } from './modules/trust/trust.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MobileConfigModule } from './modules/mobile-config/mobile-config.module';
import { ContentStudioModule } from './modules/content-studio/content-studio.module';
import { BannerModule } from './modules/banner/banner.module';
import { StorageModule } from './shared/storage/storage.module';
import { EmailModule } from './shared/email/email.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        url: configService.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
        logging: configService.get<string>('NODE_ENV') === 'development',
        poolSize: 20,
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: Number(configService.get<string | number>('REDIS_PORT', 6381)),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60000, limit: 1000 },
      { name: 'auth', ttl: 60000, limit: 10 },
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    StorageModule,
    EmailModule,
    AuthModule,
    UserModule,
    CartModule,
    SearchModule,     // MUST be before ProductModule/AuctionModule — route priority
    ProductModule,
    AuctionModule,
    WalletModule,
    LedgerModule,
    PaymentModule,
    OrderModule,
    CargoModule,
    NotificationModule,
    AdminAuthModule,
    AdminAuditModule,
    AdminSettingsModule,
    AdminOperationsModule,
    AdsModule,
    CampaignModule,
    MembershipModule,
    NegotiationModule,
    TrustModule,
    MobileConfigModule,
    ContentStudioModule,
    BannerModule,
    ReportsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
