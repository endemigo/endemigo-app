import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdminAuditAction,
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
import { ContentStudioDocumentEntity } from './entities/content-studio-document.entity';

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
    @InjectRepository(ContentStudioDocumentEntity)
    private readonly documentRepo: Repository<ContentStudioDocumentEntity>,
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
    const existing = await this.findLatestDocument();
    const currentDocument = this.toDocument(existing?.document);

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
    const documentEntity =
      existing ??
      this.documentRepo.create({
        document: currentDocument,
        updatedByAdminId: null,
      });

    documentEntity.document = nextDocument;
    documentEntity.updatedByAdminId = input.actorAdminId;
    const saved = await this.documentRepo.save(documentEntity);

    await this.adminAuditService.recordAction({
      actorAdminId: input.actorAdminId,
      actorRoles: input.actorRoles,
      action: AdminAuditAction.SETTING_UPDATED,
      targetType: 'SETTING',
      targetId: 'CONTENT_STUDIO_DOCUMENT',
      reason: input.reason,
      before: currentDocument as unknown as Record<string, unknown>,
      after: nextDocument as unknown as Record<string, unknown>,
    });

    return {
      code: RC.CONTENT_STUDIO_UPDATED,
      message: 'Icerik studyo dokumani guncellendi',
      document: this.toDocument(saved.document),
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
    const existing = await this.findLatestDocument();
    return this.toDocument(existing?.document);
  }

  private async findLatestDocument(): Promise<ContentStudioDocumentEntity | null> {
    const documents = await this.documentRepo.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });
    return documents[0] ?? null;
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
