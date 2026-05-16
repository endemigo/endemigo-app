import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdminAuditAction,
  AdminSettingKey,
  CONTENT_STUDIO_COLLECTION_KEYS,
  RC,
  type AdminRole,
  type ContentStudioCollectionKey,
  type ContentStudioDocument,
  type ContentStudioItem,
  type PublicBlogItem,
  getDefaultContentStudioDocument,
  isContentStudioDocument,
} from '@endemigo/shared';
import { Repository } from 'typeorm';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { AdminSetting } from '../admin-settings/entities/admin-setting.entity';

export interface UpdateContentStudioInput {
  actorAdminId: string;
  actorRoles: AdminRole[];
  document: ContentStudioDocument;
  version: number;
  reason: string;
}

@Injectable()
export class ContentStudioService {
  constructor(
    @InjectRepository(AdminSetting)
    private readonly settingRepo: Repository<AdminSetting>,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  async getDocument() {
    const document = await this.readDocument();
    return {
      code: RC.CONTENT_STUDIO_FETCHED,
      message: 'Icerik studyo dokumani getirildi',
      document,
    };
  }

  async updateDocument(input: UpdateContentStudioInput) {
    const existing = await this.settingRepo.findOne({
      where: { key: AdminSettingKey.CONTENT_STUDIO },
    });
    const currentDocument = this.toDocument(existing?.value);

    if (input.version !== currentDocument.version) {
      throw new ConflictException({
        code: RC.MOBILE_CONFIG_VERSION_CONFLICT,
        message: 'Icerik dokumani baska bir yonetici tarafindan guncellenmis',
      });
    }

    const nextDocument = this.normalizeDocument({
      ...input.document,
      version: currentDocument.version + 1,
    });
    const setting =
      existing ??
      this.settingRepo.create({
        key: AdminSettingKey.CONTENT_STUDIO,
        description:
          'Icerik studyo dokumani: blog, banner, popup, bulten ve operasyon koleksiyonlari',
        isSensitive: false,
      });

    setting.value = nextDocument as unknown as Record<string, unknown>;
    const saved = await this.settingRepo.save(setting);

    await this.adminAuditService.recordAction({
      actorAdminId: input.actorAdminId,
      actorRoles: input.actorRoles,
      action: AdminAuditAction.SETTING_UPDATED,
      targetType: 'SETTING',
      targetId: 'CONTENT_STUDIO',
      reason: input.reason,
      before: currentDocument as unknown as Record<string, unknown>,
      after: nextDocument as unknown as Record<string, unknown>,
    });

    return {
      code: RC.CONTENT_STUDIO_UPDATED,
      message: 'Icerik studyo dokumani guncellendi',
      document: this.toDocument(saved.value),
    };
  }

  async getPublicBlogs() {
    const document = await this.readDocument();
    const items = [...document.collections.blogs]
      .filter((item) => item.status === 'PUBLISHED')
      .sort((left, right) => left.order - right.order)
      .map((item) => this.toPublicBlog(item));

    return {
      code: RC.PUBLIC_BLOGS_FETCHED,
      message: 'Yayin bloglari getirildi',
      items,
    };
  }

  private async readDocument() {
    const setting = await this.settingRepo.findOne({
      where: { key: AdminSettingKey.CONTENT_STUDIO },
    });
    return this.toDocument(setting?.value);
  }

  private toDocument(value: unknown): ContentStudioDocument {
    if (!isContentStudioDocument(value)) {
      return getDefaultContentStudioDocument();
    }
    return this.normalizeDocument(value);
  }

  private normalizeDocument(
    value: ContentStudioDocument,
  ): ContentStudioDocument {
    const fallback = getDefaultContentStudioDocument();

    const collections = CONTENT_STUDIO_COLLECTION_KEYS.reduce(
      (accumulator, key) => {
        const sourceItems = value.collections[key] ?? fallback.collections[key];
        accumulator[key] = sourceItems.map((item, index) =>
          this.normalizeItem(item, key, index),
        );
        return accumulator;
      },
      {} as ContentStudioDocument['collections'],
    );

    return {
      version: Math.max(1, Math.floor(value.version || 1)),
      collections,
    };
  }

  private normalizeItem(
    item: ContentStudioItem,
    collectionKey: ContentStudioCollectionKey,
    index: number,
  ): ContentStudioItem {
    return {
      ...item,
      id: item.id || `${collectionKey}-${index + 1}`,
      title: item.title || `${collectionKey}-${index + 1}`,
      subtitle: item.subtitle ?? '',
      body: item.body ?? '',
      excerpt: item.excerpt ?? '',
      slug: item.slug || item.id || `${collectionKey}-${index + 1}`,
      imageUrl: item.imageUrl ?? '',
      category: item.category ?? '',
      tags: Array.isArray(item.tags) ? item.tags : [],
      route: item.route ?? '',
      updatedAt: item.updatedAt || new Date().toISOString(),
      status: item.status ?? 'DRAFT',
      order: Number.isFinite(item.order) ? item.order : index + 1,
      metadata:
        item.metadata && typeof item.metadata === 'object' ? item.metadata : {},
    };
  }

  private toPublicBlog(item: ContentStudioItem): PublicBlogItem {
    const readTimeRaw = item.metadata.readTime;
    const readTime =
      typeof readTimeRaw === 'string' && readTimeRaw.trim().length > 0
        ? readTimeRaw
        : '4 dk okuma';

    return {
      id: item.id,
      title: item.title,
      category: item.category || 'Blog',
      excerpt: item.excerpt || item.subtitle,
      readTime,
      image: item.imageUrl,
      slug: item.slug,
      body: item.body,
      publishedAt: item.updatedAt,
    };
  }
}
