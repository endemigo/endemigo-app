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

export enum SellerType {
  INDIVIDUAL = 'INDIVIDUAL',
  CORPORATE = 'CORPORATE',
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

  // Mevcut satırlar işletme bilgisiyle başvurduğu için default CORPORATE
  @Column({
    type: 'enum',
    enum: SellerType,
    default: SellerType.CORPORATE,
  })
  sellerType: SellerType;

  @Column({ type: 'varchar', nullable: true })
  taxOffice: string | null;

  @Column({ type: 'varchar', nullable: true })
  taxNumber: string | null;

  // KVKK — TC Kimlik No IBAN gibi şifrelenerek saklanır (AES-256-GCM)
  @Column({
    type: 'varchar',
    nullable: true,
    transformer: {
      to: (value: string | null) => (value ? encrypt(value) : null),
      from: (value: string | null) => (value ? decrypt(value) : null),
    },
  })
  identityNumber: string | null;

  // CR-02: KVKK — IBAN şifrelenerek saklanır (AES-256-GCM)
  @Column({
    nullable: true,
    transformer: {
      to: (value: string | null) => (value ? encrypt(value) : null),
      from: (value: string | null) => (value ? decrypt(value) : null),
    },
  })
  iban: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: SellerStatus,
    default: SellerStatus.PENDING,
  })
  status: SellerStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.15 })
  commissionRate: number;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  independentPreContractAcceptedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  jointPreContractAcceptedAt: Date | null;

  // Faz 3: Müzayede açma kademesi (admin elle verir).
  // canCreateIndependent: 40+ ürünlü bağımsız müzayede; canCreateJoint: ortak/dealer müzayede.
  @Column({ default: false })
  canCreateIndependent: boolean;

  @Column({ default: false })
  canCreateJoint: boolean;

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
