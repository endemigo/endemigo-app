import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';
import { encrypt, decrypt } from '../../../common/utils/crypto.util';

export enum SellerStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

@Entity('seller_profiles')
export class SellerProfile extends BaseEntity {
  @Column()
  userId: string;

  @OneToOne(() => User, (user) => user.sellerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  businessName: string;

  @Column({ nullable: true })
  taxOffice: string;

  @Column({ nullable: true })
  taxNumber: string;

  // CR-02: KVKK — IBAN şifrelenerek saklanır (AES-256-GCM)
  @Column({
    nullable: true,
    transformer: {
      to: (value: string | null) => value ? encrypt(value) : null,
      from: (value: string | null) => value ? decrypt(value) : null,
    },
  })
  iban: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: SellerStatus,
    default: SellerStatus.APPROVED,
  })
  status: SellerStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.15 })
  commissionRate: number;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column()
  agreementAcceptedAt: Date;

  @Column({ default: '1.0.0' })
  agreementVersion: string;

  // USER-05: Sözleşme kabulü IP ve UserAgent kaydı
  @Column({ nullable: true })
  agreementIpAddress: string;

  @Column({ nullable: true })
  agreementUserAgent: string;
}
