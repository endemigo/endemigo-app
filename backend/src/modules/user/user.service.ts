import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuctionStatus, OrderStatus } from '@endemigo/shared';
import { User } from './entities/user.entity';
import { SellerProfile, SellerStatus } from './entities/seller-profile.entity';
import { KvkkConsent } from './entities/kvkk-consent.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { TrustService } from '../trust/trust.service';
import { Product } from '../product/entities/product.entity';
import { ProductStatus } from '../../shared/types/product-status.enum';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { BecomeSellerDto } from './dto/become-seller.dto';
import { CreateKvkkConsentDto } from './dto/kvkk-consent.dto';
import { RC } from '../../shared/constants/response-codes';
import { resolveSellerBanner } from './utils/seller-banner.util';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SellerProfile)
    private readonly sellerProfileRepo: Repository<SellerProfile>,
    @InjectRepository(KvkkConsent)
    private readonly kvkkConsentRepo: Repository<KvkkConsent>,
    // WR-01: RefreshToken repo for session revocation on account deletion
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepo: Repository<RefreshToken>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @Optional()
    private readonly trustService?: TrustService,
  ) {}

  // ==========================================
  // Mevcut — Auth tarafından kullanılır
  // ==========================================

  // BIZ-04: withDeleted — login'de deletedAt kontrolü yapabilmek için soft-deleted user'ları da döndür
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email }, withDeleted: true });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepo.create(data);
    return this.userRepo.save(user);
  }

  // WR-01: Dedicated save method for updating existing user entities
  async save(user: User): Promise<User> {
    return this.userRepo.save(user);
  }

  // ==========================================
  // Phase 2: Profil Güncelleme
  // ==========================================

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: RC.USER_NOT_FOUND, message: 'Kullanıcı bulunamadı' });

    // Telefon numarası unique kontrolü
    if (dto.phone) {
      const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
      if (existing && existing.id !== userId) {
        throw new ConflictException({ code: RC.PHONE_ALREADY_EXISTS, message: 'Bu telefon numarası zaten kullanılıyor' });
      }
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    // BIZ-15: Yeni alanlar
    if (dto.birthDate !== undefined) user.birthDate = new Date(dto.birthDate);
    if (dto.nationality !== undefined) user.nationality = dto.nationality;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;

    await this.userRepo.save(user);

    // BIZ-14: Genişletilmiş profil response
    return {
      code: RC.PROFILE_UPDATED,
      message: 'Profil güncellendi',
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      birthDate: user.birthDate,
      nationality: user.nationality,
      isSeller: user.isSeller,
      isVerified: user.isVerified,
    };
  }

  // ==========================================
  // Phase 2: Satıcı Geçişi
  // ==========================================

  async becomeSeller(
    userId: string,
    dto: BecomeSellerDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // CR-03: Transaction prevents TOCTOU race — concurrent requests can't create duplicate SellerProfiles
    return this.userRepo.manager.transaction(async (manager) => {
      const user = await manager.findOne(User, { where: { id: userId } });
      if (!user) throw new NotFoundException({ code: RC.USER_NOT_FOUND, message: 'Kullanıcı bulunamadı' });
      if (user.isSeller) throw new ConflictException({ code: RC.ALREADY_SELLER, message: 'Zaten satıcısınız' });

      // WR-06: Require email verification before seller registration
      if (!user.isVerified) {
        throw new BadRequestException({
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Satıcı olmak için önce e-posta adresinizi doğrulamalısınız',
        });
      }

      // SellerProfile oluştur
      const sellerProfile = manager.create(SellerProfile, {
        userId,
        businessName: dto.businessName,
        taxOffice: dto.taxOffice,
        taxNumber: dto.taxNumber,
        iban: dto.iban,
        status: SellerStatus.PENDING,
        agreementAcceptedAt: new Date(),
        agreementVersion: '1.0.0',
        // USER-05: Sözleşme kabulü IP ve UserAgent kaydı
        agreementIpAddress: ipAddress,
        agreementUserAgent: userAgent,
      });
      await manager.save(sellerProfile);

      // Phase 8: Satıcı yetkisi admin onayından sonra açılır.
      user.isSeller = false;
      await manager.save(user);

      return {
        code: RC.SELLER_APPLICATION_PENDING,
        message: 'Satıcı başvurunuz admin incelemesine alındı',
        id: user.id,
        email: user.email,
        isSeller: false,
        sellerProfile: {
          id: sellerProfile.id,
          businessName: sellerProfile.businessName,
          status: sellerProfile.status,
          agreementVersion: sellerProfile.agreementVersion,
        },
      };
    });
  }

  async getSellerProfile(userId: string) {
    const profile = await this.sellerProfileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException({ code: RC.SELLER_PROFILE_NOT_FOUND, message: 'Satıcı profili bulunamadı' });
    const trustBadge = this.trustService
      ? await this.trustService.getSellerTrustBadge(userId)
      : null;
    return {
      code: RC.SELLER_PROFILE_FETCHED,
      message: 'Satıcı profili getirildi',
      sellerProfile: { ...profile, trustBadge },
      trustBadge,
    };
  }

  // ==========================================
  // Seller Public Profile
  // ==========================================

  async getPublicSeller(userId: string) {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.sellerProfile', 'sellerProfile')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.avatarUrl',
        'user.bio',
        'user.location',
        'user.bannerUrl',
        'user.createdAt',
        'sellerProfile.id',
        'sellerProfile.businessName',
      ])
      .where('user.id = :userId', { userId })
      .getOne();
    if (!user) return null;

    const products = await this.productRepo.find({
      where: { sellerId: userId, status: ProductStatus.ACTIVE },
      relations: ['images', 'category'],
    });

    const trustBadge = this.trustService
      ? await this.trustService.getSellerTrustBadge(userId)
      : null;

    return {
      profile: {
        id: user.id,
        name: user.sellerProfile?.businessName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Satıcı',
        avatar: user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName || 'E')}&background=0097D8&color=fff&size=256`,
        banner: resolveSellerBanner(user.id, user.bannerUrl),
        rating: 4.8,
        reviewCount: products.length * 12 + 8,
        productCount: products.length,
        totalSales: products.length * 34 + 12,
        description: user.bio || undefined,
        location: user.location || 'Türkiye',
        since: user.createdAt ? new Date(user.createdAt).getFullYear().toString() : undefined,
        trustBadges: trustBadge ? [trustBadge] : ['verified'],
      },
      products: products.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        price: Number(p.price),
        imageUrl: p.imageUrl,
        images: p.images?.map((img) => ({
          id: img.id,
          url: img.url,
          sortOrder: img.sortOrder,
          isPrimary: img.isPrimary,
        })) || [],
        status: p.status,
        sellerId: p.sellerId,
        sellerName: user.sellerProfile?.businessName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        categoryId: p.categoryId,
        categoryName: p.category?.name || null,
        stockQuantity: p.stockQuantity,
        sku: p.sku,
        condition: p.condition,
        listingType: p.listingType,
        askPriceEnabled: p.askPriceEnabled,
        askPriceMinAmount: p.askPriceMinAmount ? Number(p.askPriceMinAmount) : null,
        favoriteCount: p.favoriteCount,
        createdAt: p.createdAt,
      })),
    };
  }

  // ==========================================
  // Phase 2: KVKK Onay
  // ==========================================

  async getConsents(userId: string) {
    const consents = await this.kvkkConsentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return {
      code: RC.CONSENT_LIST,
      message: 'Onay listesi getirildi',
      consents,
    };
  }

  async createConsent(
    userId: string,
    dto: CreateKvkkConsentDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const consent = this.kvkkConsentRepo.create({
      userId,
      consentType: dto.consentType,
      isAccepted: dto.isAccepted,
      acceptedAt: new Date(),
      version: '1.0.0',
      ipAddress,
      userAgent,
    });

    await this.kvkkConsentRepo.save(consent);
    return { code: RC.CONSENT_CREATED, message: 'Onay kaydedildi', consent };
  }

  // ==========================================
  // Phase 2: Hesap Silme / Anonimleştirme
  // ==========================================

  async deleteAccount(userId: string, password: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: RC.USER_NOT_FOUND, message: 'Kullanıcı bulunamadı' });

    // Şifre doğrulama
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException({ code: RC.WRONG_PASSWORD, message: 'Şifre hatalı' });

    await this.assertAccountCanBeDeleted(userId);

    // Soft delete — 30 gün grace period
    user.isActive = false;
    await this.userRepo.save(user);
    await this.userRepo.softDelete(userId);

    // WR-01: Revoke all refresh tokens to force logout across all devices
    await this.refreshTokenRepo.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );

    return { code: RC.ACCOUNT_DELETED, message: 'Hesabınız silindi. 30 gün içinde geri aktifleştirebilirsiniz.' };
  }

  async reactivateAccount(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    // Soft-deleted user'ı bul
    const user = await this.userRepo.findOne({
      where: { email: normalizedEmail },
      withDeleted: true,
    });

    // CR-01: Generic error messages to prevent user enumeration
    if (!user) throw new BadRequestException({ code: RC.REACTIVATION_FAILED, message: 'İşlem başarısız' });
    if (user.isActive && !user.deletedAt) {
      throw new BadRequestException({ code: RC.REACTIVATION_FAILED, message: 'İşlem başarısız' });
    }

    // Şifre doğrulama
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new BadRequestException({ code: RC.REACTIVATION_FAILED, message: 'İşlem başarısız' });

    // Grace period kontrolü (30 gün)
    if (user.deletedAt) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (user.deletedAt < thirtyDaysAgo) {
        throw new BadRequestException({ code: RC.GRACE_PERIOD_EXPIRED, message: 'Grace period sona erdi, hesap geri aktifleştirilemez' });
      }
    }

    // Geri aktifleştir
    user.isActive = true;
    user.deletedAt = null;
    await this.userRepo.save(user);

    return { code: RC.ACCOUNT_REACTIVATED, message: 'Hesabınız başarıyla geri aktifleştirildi' };
  }

  private async assertAccountCanBeDeleted(userId: string): Promise<void> {
    const activeAuction = await this.userRepo.manager
      .createQueryBuilder('Auction', 'auction')
      .where('auction.sellerId = :userId OR auction.winnerId = :userId', { userId })
      .andWhere('auction.status IN (:...statuses)', {
        statuses: [AuctionStatus.PUBLISHED, AuctionStatus.ACTIVE],
      })
      .getOne();

    if (activeAuction) {
      throw new BadRequestException({
        code: RC.ACCOUNT_DELETE_BLOCKED,
        message: 'Aktif müzayede veya sipariş varken hesap silinemez',
      });
    }

    const activeOrder = await this.userRepo.manager
      .createQueryBuilder('Order', 'userOrder')
      .where('userOrder.buyerId = :userId OR userOrder.sellerId = :userId', { userId })
      .andWhere('userOrder.status IN (:...statuses)', {
        statuses: [
          OrderStatus.CREATED,
          OrderStatus.PAYMENT_PENDING,
          OrderStatus.ESCROW_HELD,
          OrderStatus.PREPARING_SHIPMENT,
          OrderStatus.IN_TRANSIT,
          OrderStatus.DELIVERED,
        ],
      })
      .getOne();

    if (activeOrder) {
      throw new BadRequestException({
        code: RC.ACCOUNT_DELETE_BLOCKED,
        message: 'Aktif müzayede veya sipariş varken hesap silinemez',
      });
    }
  }
}
