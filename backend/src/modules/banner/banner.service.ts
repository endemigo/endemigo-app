import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminAuditAction, AdminRole, RC } from '@endemigo/shared';
import { Repository } from 'typeorm';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { CreateBannerDto } from './dto/create-banner.dto';
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

    const banner = this.bannerRepo.create({
      name: dto.name,
      slug: dto.slug,
      slideDuration: dto.slideDuration ?? 3000,
      aspectRatio: dto.aspectRatio ?? '16:9',
      items: dto.items,
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

  async listBanners() {
    const items = await this.bannerRepo.find({
      order: { createdAt: 'DESC' },
    });
    return {
      code: RC.BANNER_LISTED,
      message: 'Banner listesi getirildi',
      items,
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
    if (dto.items !== undefined) banner.items = dto.items;

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

    if (!banner) {
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
}
