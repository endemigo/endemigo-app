import { ConflictException } from '@nestjs/common';
import {
  AdminAuditAction,
  AdminRole,
  RC,
  getDefaultContentStudioDocument,
} from '@endemigo/shared';
import { AdminAuditService } from '../admin-audit/admin-audit.service';
import { ContentStudioService } from './content-studio.service';

describe('ContentStudioService', () => {
  let repo: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let adminAuditService: {
    recordAction: jest.Mock;
  };
  let service: ContentStudioService;

  beforeEach(() => {
    repo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((value) => ({ id: 'content-doc-1', ...value })),
      save: jest.fn(async (value) => value),
    };
    adminAuditService = {
      recordAction: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    };
    service = new ContentStudioService(
      repo as never,
      adminAuditService as unknown as AdminAuditService,
    );
  });

  it('returns the default document when content studio storage is empty', async () => {
    const result = await service.getDocument();

    expect(result.code).toBe(RC.CONTENT_STUDIO_FETCHED);
    expect(result.document.version).toBe(1);
    expect(result.document.collections.blogs.length).toBeGreaterThan(0);
  });

  it('updates the document and records an audit entry', async () => {
    const document = getDefaultContentStudioDocument();
    document.collections.blogs[0].title = 'Yeni blog';

    const result = await service.updateDocument({
      actorAdminId: 'admin-1',
      actorRoles: [AdminRole.OPERATIONS],
      document,
      version: 1,
      reason: 'blog refresh',
    });

    expect(result.code).toBe(RC.CONTENT_STUDIO_UPDATED);
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedByAdminId: 'admin-1',
      }),
    );
    expect(adminAuditService.recordAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AdminAuditAction.SETTING_UPDATED,
        targetId: 'CONTENT_STUDIO_DOCUMENT',
      }),
    );
  });

  it('throws conflict when the incoming version is stale', async () => {
    repo.find.mockResolvedValue([
      {
        id: 'content-doc-1',
        document: {
          ...getDefaultContentStudioDocument(),
          version: 3,
        },
      },
    ]);

    await expect(
      service.updateDocument({
        actorAdminId: 'admin-2',
        actorRoles: [AdminRole.OPERATIONS],
        document: getDefaultContentStudioDocument(),
        version: 2,
        reason: 'stale update',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('maps only published blog entries for the public feed', async () => {
    const document = getDefaultContentStudioDocument();
    document.collections.blogs.push({
      id: 'blog-draft',
      title: 'Taslak',
      titleEn: 'Draft',
      body: 'Taslak icerik',
      bodyEn: 'Draft content',
      excerpt: 'Taslak icerik',
      excerptEn: 'Draft content',
      slug: 'taslak',
      imageUrl: 'https://example.com/draft.jpg',
      status: 'DRAFT',
      order: 99,
      tags: [],
      updatedAt: '2026-05-15T00:00:00.000Z',
      readTime: '',
      readTimeEn: '',
    });
    repo.find.mockResolvedValue([
      {
        id: 'content-doc-1',
        document,
      },
    ]);

    const result = await service.getPublicBlogs();

    expect(result.code).toBe(RC.PUBLIC_BLOGS_FETCHED);
    expect(result.items.every((item) => item.slug !== 'taslak')).toBe(true);
  });
});
