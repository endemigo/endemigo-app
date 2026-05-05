import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdminAuditAction,
  AdminRole,
  MobileConfigStatus,
  RC,
  getDefaultMobileExperienceConfig,
  sanitizeMobileExperienceConfig,
  validateMobileExperienceConfig,
  type MobileExperienceConfig,
  type MobileExperienceDocumentResponse,
} from '@endemigo/shared';
import { Repository } from 'typeorm';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { MobileConfigDocument } from './entities/mobile-config-document.entity';

interface DraftActorInput {
  actorAdminId: string;
  actorRoles: AdminRole[];
  draft: MobileExperienceConfig;
  reason: string;
}

interface PublishActorInput {
  actorAdminId: string;
  actorRoles: AdminRole[];
  reason: string;
}

@Injectable()
export class MobileConfigService {
  constructor(
    @InjectRepository(MobileConfigDocument)
    private readonly mobileConfigRepo: Repository<MobileConfigDocument>,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  async getDraft() {
    const document = await this.loadDocument();
    return {
      code: RC.MOBILE_CONFIG_DRAFT_FETCHED,
      message: 'Mobil uygulama taslak konfigurasyonu getirildi',
      document: this.toDocumentResponse(document, MobileConfigStatus.DRAFT),
    };
  }

  async updateDraft(input: DraftActorInput) {
    this.assertValidDraft(input.draft);
    const existing = await this.findLatestDocument();
    const previousDraft = existing?.draft ?? getDefaultMobileExperienceConfig();

    const entity =
      existing
      ?? this.mobileConfigRepo.create({
        draft: previousDraft,
        published: null,
        updatedByAdminId: null,
        publishedByAdminId: null,
        publishedAt: null,
      });

    entity.draft = input.draft;
    entity.updatedByAdminId = input.actorAdminId;
    const saved = await this.mobileConfigRepo.save(entity);

    await this.adminAuditService.recordAction({
      actorAdminId: input.actorAdminId,
      actorRoles: input.actorRoles,
      action: AdminAuditAction.SETTING_UPDATED,
      targetType: 'SETTING',
      targetId: 'MOBILE_CONFIG_DRAFT',
      reason: input.reason,
      before: { draft: previousDraft },
      after: { draft: saved.draft },
    });

    return {
      code: RC.MOBILE_CONFIG_DRAFT_UPDATED,
      message: 'Mobil uygulama taslagi guncellendi',
      document: this.toDocumentResponse(saved, MobileConfigStatus.DRAFT),
    };
  }

  async publish(input: PublishActorInput) {
    const existing = await this.findLatestDocument();
    const entity =
      existing
      ?? this.mobileConfigRepo.create({
        draft: getDefaultMobileExperienceConfig(),
        published: null,
        updatedByAdminId: null,
        publishedByAdminId: null,
        publishedAt: null,
      });

    this.assertValidDraft(entity.draft);
    const previousPublished = entity.published;
    entity.published = entity.draft;
    entity.publishedAt = new Date();
    entity.publishedByAdminId = input.actorAdminId;
    const saved = await this.mobileConfigRepo.save(entity);

    await this.adminAuditService.recordAction({
      actorAdminId: input.actorAdminId,
      actorRoles: input.actorRoles,
      action: AdminAuditAction.SETTING_UPDATED,
      targetType: 'SETTING',
      targetId: 'MOBILE_CONFIG_PUBLISHED',
      reason: input.reason,
      before: { published: previousPublished },
      after: { published: saved.published },
    });

    return {
      code: RC.MOBILE_CONFIG_PUBLISHED,
      message: 'Mobil uygulama konfigurasyonu yayina alindi',
      document: this.toDocumentResponse(saved, MobileConfigStatus.PUBLISHED),
    };
  }

  async getPublished() {
    const document = await this.loadDocument();
    return {
      code: RC.MOBILE_CONFIG_PUBLISHED_FETCHED,
      message: 'Mobil uygulama yayin konfigurasyonu getirildi',
      document: this.toDocumentResponse(document, MobileConfigStatus.PUBLISHED),
    };
  }

  async getPublicConfig() {
    const document = await this.findLatestDocument();

    return {
      code: RC.MOBILE_CONFIG_PUBLISHED_FETCHED,
      message: 'Mobil uygulama konfigurasyonu getirildi',
      config: sanitizeMobileExperienceConfig(document?.published ?? null),
      publishedAt: document?.publishedAt?.toISOString() ?? null,
    };
  }

  private async loadDocument(): Promise<MobileConfigDocument> {
    const existing = await this.findLatestDocument();
    if (existing) {
      return existing;
    }

    return this.mobileConfigRepo.create({
      draft: getDefaultMobileExperienceConfig(),
      published: null,
      updatedByAdminId: null,
      publishedByAdminId: null,
      publishedAt: null,
    });
  }

  private async findLatestDocument(): Promise<MobileConfigDocument | null> {
    const documents = await this.mobileConfigRepo.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });

    return documents[0] ?? null;
  }

  private assertValidDraft(draft: unknown): asserts draft is MobileExperienceConfig {
    const errors = validateMobileExperienceConfig(draft);
    if (errors.length > 0) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Mobil uygulama konfigurasyonu gecersiz',
        errors,
      });
    }
  }

  private toDocumentResponse(
    document: MobileConfigDocument,
    status: MobileConfigStatus,
  ): MobileExperienceDocumentResponse {
    return {
      status,
      draft: sanitizeMobileExperienceConfig(document.draft),
      published: document.published ? sanitizeMobileExperienceConfig(document.published) : null,
      publishedAt: document.publishedAt?.toISOString() ?? null,
      updatedByAdminId: document.updatedByAdminId ?? null,
      publishedByAdminId: document.publishedByAdminId ?? null,
    };
  }
}
