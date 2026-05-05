import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AdPlacementType, AdRequestStatus } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Product } from '../../product/entities/product.entity';
import { AdPackage } from './ad-package.entity';
import { AdPlacement } from './ad-placement.entity';

@Entity('ad_requests')
export class AdRequest extends BaseEntity {
  @Column()
  sellerId: string;

  @Column({ type: 'uuid', nullable: true })
  productId: string | null;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'productId' })
  product: Product | null;

  @Column()
  packageId: string;

  @ManyToOne(() => AdPackage, (adPackage) => adPackage.requests)
  @JoinColumn({ name: 'packageId' })
  adPackage: AdPackage;

  @Column({ type: 'enum', enum: AdPlacementType })
  placementType: AdPlacementType;

  @Column({
    type: 'enum',
    enum: AdRequestStatus,
    default: AdRequestStatus.ADMIN_REVIEW,
  })
  status: AdRequestStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'TRY' })
  currency: string;

  @Column({ type: 'uuid', nullable: true })
  walletHoldId: string | null;

  @Column({ type: 'text', nullable: true })
  reviewReason: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  rejectedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  startsAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt: Date | null;

  @Column()
  idempotencyKey: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @OneToMany(() => AdPlacement, (placement) => placement.adRequest)
  placements: AdPlacement[];
}
