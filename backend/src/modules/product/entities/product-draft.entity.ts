import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ListingType } from '../../../shared/types/listing-type.enum';
import { ListingDraftEntryMode } from '../../../shared/types/listing-draft-entry-mode.enum';
import { ListingDraftStatus } from '../../../shared/types/listing-draft-status.enum';
import { User } from '../../user/entities/user.entity';
import { Category } from './category.entity';
import { Product } from './product.entity';

@Entity('product_listing_drafts')
export class ProductDraft extends BaseEntity {
  @Column()
  sellerId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category | null;

  @Column({
    type: 'enum',
    enum: ListingDraftEntryMode,
    enumName: 'listing_draft_entry_mode',
  })
  entryMode: ListingDraftEntryMode;

  @Column({ type: 'enum', enum: ListingType, enumName: 'listing_type' })
  listingType: ListingType;

  @Column({
    type: 'enum',
    enum: ListingDraftStatus,
    enumName: 'listing_draft_status',
    default: ListingDraftStatus.DRAFT,
  })
  status: ListingDraftStatus;

  @Column({ type: 'int', default: 1 })
  currentStep: number;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, unknown>;

  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Product | null;
}
