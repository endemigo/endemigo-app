import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
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
import { AdminSettingsService } from '../admin-settings/admin-settings.service';
import { MobileConfigDocument } from './entities/mobile-config-document.entity';

interface DraftActorInput {
  actorAdminId: string;
  actorRoles: AdminRole[];
  version: number;
  draft: MobileExperienceConfig;
  reason?: string;
}

interface PublishActorInput {
  actorAdminId: string;
  actorRoles: AdminRole[];
  version: number;
  reason?: string;
}

@Injectable()
export class MobileConfigService {
  private versionColumnEnsured = false;

  constructor(
    @InjectRepository(MobileConfigDocument)
    private readonly mobileConfigRepo: Repository<MobileConfigDocument>,
    private readonly adminAuditService: AdminAuditService,
    private readonly adminSettingsService: AdminSettingsService,
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
        version: 1,
        updatedByAdminId: null,
        publishedByAdminId: null,
        publishedAt: null,
      });

    this.assertVersionMatch(Number(entity.version ?? 1), input.version);

    entity.draft = input.draft;
    entity.version = Number(entity.version ?? 1) + 1;
    entity.updatedByAdminId = input.actorAdminId;
    const saved = await this.mobileConfigRepo.save(entity);

    await this.adminAuditService.recordAction({
      actorAdminId: input.actorAdminId,
      actorRoles: input.actorRoles,
      action: AdminAuditAction.SETTING_UPDATED,
      targetType: 'SETTING',
      targetId: 'MOBILE_CONFIG_DRAFT',
      reason: input.reason?.trim() || 'Panel üzerinden taslak güncellendi',
      before: { draft: previousDraft },
      after: { draft: saved.draft },
      metadata: { version: saved.version },
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
        version: 1,
        updatedByAdminId: null,
        publishedByAdminId: null,
        publishedAt: null,
      });

    this.assertVersionMatch(Number(entity.version ?? 1), input.version);
    this.assertValidDraft(entity.draft);
    const previousPublished = entity.published;
    entity.published = entity.draft;
    entity.version = Number(entity.version ?? 1) + 1;
    entity.publishedAt = new Date();
    entity.publishedByAdminId = input.actorAdminId;
    const saved = await this.mobileConfigRepo.save(entity);

    await this.adminAuditService.recordAction({
      actorAdminId: input.actorAdminId,
      actorRoles: input.actorRoles,
      action: AdminAuditAction.SETTING_UPDATED,
      targetType: 'SETTING',
      targetId: 'MOBILE_CONFIG_PUBLISHED',
      reason: input.reason?.trim() || 'Panel üzerinden yayına alındı',
      before: { published: previousPublished },
      after: { published: saved.published },
      metadata: { version: saved.version },
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
    const imageUploadLimits =
      await this.adminSettingsService.getProductImageUploadLimits();

    return {
      code: RC.MOBILE_CONFIG_PUBLISHED_FETCHED,
      message: 'Mobil uygulama konfigurasyonu getirildi',
      config: sanitizeMobileExperienceConfig(document?.published ?? null),
      imageUploadLimits,
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
      version: 1,
      updatedByAdminId: null,
      publishedByAdminId: null,
      publishedAt: null,
    });
  }

  private async findLatestDocument(): Promise<MobileConfigDocument | null> {
    try {
      const documents = await this.mobileConfigRepo.find({
        order: { createdAt: 'DESC' },
        take: 1,
      });
      return documents[0] ?? null;
    } catch (error) {
      if (this.isMissingVersionColumnError(error)) {
        await this.ensureVersionColumn();
        const documents = await this.mobileConfigRepo.find({
          order: { createdAt: 'DESC' },
          take: 1,
        });
        return documents[0] ?? null;
      }
      throw error;
    }
  }

  private assertValidDraft(draft: unknown): asserts draft is MobileExperienceConfig {
    const errors = validateMobileExperienceConfig(draft);
    if (errors.length > 0) {
      console.warn('MOBILE_CONFIG_VALIDATION_ERRORS:', JSON.stringify(errors, null, 2));
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
  ): any {
    return {
      status,
      version: document.version ?? 1,
      draft: sanitizeMobileExperienceConfig(document.draft),
      published: document.published ? sanitizeMobileExperienceConfig(document.published) : null,
      publishedAt: document.publishedAt?.toISOString() ?? null,
      updatedAt: document.updatedAt?.toISOString() ?? null,
      updatedByAdminId: document.updatedByAdminId ?? null,
      publishedByAdminId: document.publishedByAdminId ?? null,
    };
  }

  private assertVersionMatch(currentVersion: number, incomingVersion: number) {
    if (currentVersion !== incomingVersion) {
      throw new ConflictException({
        code: RC.MOBILE_CONFIG_VERSION_CONFLICT,
        message: 'Taslak baska bir yonetici tarafindan guncellenmis',
        currentVersion,
      });
    }
  }

  private isMissingVersionColumnError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const message = error.message.toLowerCase();
    return message.includes('column') && message.includes('version') && message.includes('does not exist');
  }

  private async ensureVersionColumn() {
    if (this.versionColumnEnsured) return;
    await this.mobileConfigRepo.query(
      'ALTER TABLE mobile_config_documents ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1',
    );
    this.versionColumnEnsured = true;
  }
}
// Trigger rebuild to pick up shared-types changes.
