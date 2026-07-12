import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { AdminAuditAction, AdminRole, RC } from '@endemigo/shared';
import type { BannerItem } from '@endemigo/shared';
import { ILike, Repository } from 'typeorm';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { BannerItemDto } from './dto/banner-item.dto';
import { CreateBannerDto } from './dto/create-banner.dto';
import { ListBannersQueryDto } from './dto/list-banners.query.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { BannerEntity } from './entities/banner.entity';

export interface AuditActorInput {
  actorAdminId: string;
  actorRoles: AdminRole[];
  reason: string;
}

@Injectable()
export class BannerService {
  constructor(
    @InjectRepository(BannerEntity)
    private readonly bannerRepo: Repository<BannerEntity>,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  async createBanner(dto: CreateBannerDto, actor: AuditActorInput) {
    const existing = await this.bannerRepo.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException({
        code: RC.DUPLICATE_BANNER_SLUG,
        message: 'Bu slug ile kayıtlı başka bir banner zaten var',
      });
    }

    const startAt = dto.startAt ? new Date(dto.startAt) : null;
    const endAt = dto.endAt ? new Date(dto.endAt) : null;
    this.assertValidWindow(startAt, endAt);

    const banner = this.bannerRepo.create({
      name: dto.name,
      slug: dto.slug,
      slideDuration: dto.slideDuration ?? 3000,
      aspectRatio: dto.aspectRatio ?? '16:9',
      items: this.withItemIds(dto.items),
      isActive: dto.isActive ?? true,
      startAt,
      endAt,
    });

    const saved = await this.bannerRepo.save(banner);

    await this.adminAuditService.recordAction({
      actorAdminId: actor.actorAdminId,
      actorRoles: actor.actorRoles,
      action: AdminAuditAction.SETTING_UPDATED,
      targetType: 'SETTING',
      targetId: 'BANNER_' + saved.id,
      reason: actor.reason,
      before: {},
      after: saved as unknown as Record<string, unknown>,
    });

    return {
      code: RC.BANNER_CREATED,
      message: 'Banner başarıyla oluşturuldu',
      banner: saved,
    };
  }

  async listBanners(query: ListBannersQueryDto = {}) {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Math.floor(query.limit ?? 25)));
    const slugFilter = query.slug?.trim();

    const [items, total] = await this.bannerRepo.findAndCount({
      where: slugFilter ? { slug: ILike(`%${slugFilter}%`) } : {},
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      code: RC.BANNER_LISTED,
      message: 'Banner listesi getirildi',
      items,
      total,
      page,
      limit,
    };
  }

  async getBanner(id: string) {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException({
        code: RC.BANNER_NOT_FOUND,
        message: 'Banner bulunamadı',
      });
    }
    return {
      code: RC.BANNER_FETCHED,
      message: 'Banner detayları getirildi',
      banner,
    };
  }

  async updateBanner(id: string, dto: UpdateBannerDto, actor: AuditActorInput) {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException({
        code: RC.BANNER_NOT_FOUND,
        message: 'Banner bulunamadı',
      });
    }

    const beforeState = JSON.parse(JSON.stringify(banner));

    if (dto.slug && dto.slug !== banner.slug) {
      const existing = await this.bannerRepo.findOne({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException({
          code: RC.DUPLICATE_BANNER_SLUG,
          message: 'Bu slug ile kayıtlı başka bir banner zaten var',
        });
      }
      banner.slug = dto.slug;
    }

    if (dto.name !== undefined) banner.name = dto.name;
    if (dto.slideDuration !== undefined) banner.slideDuration = dto.slideDuration;
    if (dto.aspectRatio !== undefined) banner.aspectRatio = dto.aspectRatio;
    if (dto.items !== undefined) banner.items = this.withItemIds(dto.items);
    if (dto.isActive !== undefined) banner.isActive = dto.isActive;
    if (dto.startAt !== undefined) banner.startAt = dto.startAt ? new Date(dto.startAt) : null;
    if (dto.endAt !== undefined) banner.endAt = dto.endAt ? new Date(dto.endAt) : null;
    this.assertValidWindow(banner.startAt, banner.endAt);

    const saved = await this.bannerRepo.save(banner);

    await this.adminAuditService.recordAction({
      actorAdminId: actor.actorAdminId,
      actorRoles: actor.actorRoles,
      action: AdminAuditAction.SETTING_UPDATED,
      targetType: 'SETTING',
      targetId: 'BANNER_' + saved.id,
      reason: actor.reason,
      before: beforeState,
      after: saved as unknown as Record<string, unknown>,
    });

    return {
      code: RC.BANNER_UPDATED,
      message: 'Banner başarıyla güncellendi',
      banner: saved,
    };
  }

  async deleteBanner(id: string, actor: AuditActorInput) {
    const banner = await this.bannerRepo.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException({
        code: RC.BANNER_NOT_FOUND,
        message: 'Banner bulunamadı',
      });
    }

    const beforeState = JSON.parse(JSON.stringify(banner));

    await this.bannerRepo.softRemove(banner);

    await this.adminAuditService.recordAction({
      actorAdminId: actor.actorAdminId,
      actorRoles: actor.actorRoles,
      action: AdminAuditAction.SETTING_UPDATED,
      targetType: 'SETTING',
      targetId: 'BANNER_' + id,
      reason: actor.reason,
      before: beforeState,
      after: { deleted: true },
    });

    return {
      code: RC.BANNER_DELETED,
      message: 'Banner başarıyla silindi',
    };
  }

  async getPublicBanner(idOrSlug: string) {
    // Try UUID first, then slug
    let banner = await this.bannerRepo.findOne({ where: { id: idOrSlug } });
    if (!banner) {
      banner = await this.bannerRepo.findOne({ where: { slug: idOrSlug } });
    }

    if (!banner || !this.isCurrentlyVisible(banner)) {
      throw new NotFoundException({
        code: RC.BANNER_NOT_FOUND,
        message: 'Banner bulunamadı',
      });
    }

    return {
      code: RC.BANNER_FETCHED,
      message: 'Banner başarıyla getirildi',
      banner,
    };
  }

  private isCurrentlyVisible(banner: BannerEntity): boolean {
    if (!banner.isActive) return false;
    const now = new Date();
    if (banner.startAt && banner.startAt > now) return false;
    if (banner.endAt && banner.endAt < now) return false;
    return true;
  }

  private assertValidWindow(startAt: Date | null, endAt: Date | null) {
    if (startAt && endAt && endAt <= startAt) {
      throw new BadRequestException({
        code: RC.BANNER_INVALID_WINDOW,
        message: 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır',
      });
    }
  }

  private withItemIds(items: BannerItemDto[]): BannerItem[] {
    return items.map((item) => ({
      ...item,
      id: item.id?.trim() ? item.id : randomUUID(),
    })) as BannerItem[];
  }
}
