import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';

export enum ConsentType {
  DATA_PROCESSING = 'DATA_PROCESSING',
  MARKETING = 'MARKETING',
  THIRD_PARTY_SHARING = 'THIRD_PARTY_SHARING',
}

@Entity('kvkk_consents')
export class KvkkConsent extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: ConsentType })
  consentType: ConsentType;

  @Column({ default: '1.0.0' })
  version: string;

  @Column()
  isAccepted: boolean;

  @Column()
  acceptedAt: Date;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  userAgent: string;
}
