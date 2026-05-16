import { Column, Entity } from 'typeorm';
import type { ContentStudioDocument } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('content_studio_documents')
export class ContentStudioDocumentEntity extends BaseEntity {
  @Column({ type: 'jsonb', default: {} })
  document: ContentStudioDocument;

  @Column({ type: 'uuid', nullable: true })
  updatedByAdminId: string | null;
}
