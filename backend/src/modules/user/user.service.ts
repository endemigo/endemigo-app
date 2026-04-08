import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { SellerProfile, SellerStatus } from './entities/seller-profile.entity';
import { KvkkConsent } from './entities/kvkk-consent.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { BecomeSellerDto } from './dto/become-seller.dto';
import { CreateKvkkConsentDto } from './dto/kvkk-consent.dto';
import { RC } from '../../shared/constants/response-codes';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(SellerProfile)
    private readonly sellerProfileRepo: Repository<SellerProfile>,
    @InjectRepository(KvkkConsent)
    private readonly kvkkConsentRepo: Repository<KvkkConsent>,
  ) {}

  // ==========================================
  // Mevcut — Auth tarafından kullanılır
  // ==========================================

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepo.create(data);
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

    await this.userRepo.save(user);

    return {
      code: RC.PROFILE_UPDATED,
      message: 'Profil güncellendi',
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      isSeller: user.isSeller,
    };
  }

  // ==========================================
  // Phase 2: Satıcı Geçişi
  // ==========================================

  async becomeSeller(userId: string, dto: BecomeSellerDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException({ code: RC.USER_NOT_FOUND, message: 'Kullanıcı bulunamadı' });
    if (user.isSeller) throw new ConflictException({ code: RC.ALREADY_SELLER, message: 'Zaten satıcısınız' });

    // SellerProfile oluştur
    const sellerProfile = this.sellerProfileRepo.create({
      userId,
      businessName: dto.businessName,
      taxOffice: dto.taxOffice,
      taxNumber: dto.taxNumber,
      iban: dto.iban,
      status: SellerStatus.APPROVED, // Otomatik onay — admin süreci Phase 11
      approvedAt: new Date(),
      agreementAcceptedAt: new Date(),
      agreementVersion: '1.0.0',
    });

    await this.sellerProfileRepo.save(sellerProfile);

    // User isSeller flagini güncelle
    user.isSeller = true;
    await this.userRepo.save(user);

    return {
      code: RC.BECOME_SELLER_SUCCESS,
      message: 'Satıcı hesabınız aktif edildi',
      id: user.id,
      email: user.email,
      isSeller: true,
      sellerProfile: {
        id: sellerProfile.id,
        businessName: sellerProfile.businessName,
        status: sellerProfile.status,
        agreementVersion: sellerProfile.agreementVersion,
      },
    };
  }

  async getSellerProfile(userId: string) {
    const profile = await this.sellerProfileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException({ code: RC.SELLER_PROFILE_NOT_FOUND, message: 'Satıcı profili bulunamadı' });
    return profile;
  }

  // ==========================================
  // Phase 2: KVKK Onay
  // ==========================================

  async getConsents(userId: string) {
    const consents = await this.kvkkConsentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return consents;
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

    // Aktif müzayede kontrolü — basit kontrol, genişletilecek
    // TODO: Phase 5+ → aktif sipariş ve müzayede kontrolleri

    // Soft delete — 30 gün grace period
    user.isActive = false;
    await this.userRepo.save(user);
    await this.userRepo.softDelete(userId);

    return { code: RC.ACCOUNT_DELETED, message: 'Hesabınız silindi. 30 gün içinde geri aktifleştirebilirsiniz.' };
  }

  async reactivateAccount(email: string, password: string) {
    // Soft-deleted user'ı bul
    const user = await this.userRepo.findOne({
      where: { email },
      withDeleted: true,
    });

    if (!user) throw new NotFoundException({ code: RC.USER_NOT_FOUND, message: 'Hesap bulunamadı' });
    if (user.isActive && !user.deletedAt) {
      throw new BadRequestException({ code: RC.ACCOUNT_ALREADY_ACTIVE, message: 'Hesabınız zaten aktif' });
    }

    // Şifre doğrulama
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException({ code: RC.WRONG_PASSWORD, message: 'Şifre hatalı' });

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
}
