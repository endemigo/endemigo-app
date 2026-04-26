import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Wallet } from './wallet.entity';
import { User } from '../../user/entities/user.entity';
import { HoldStatus } from '../../../shared/types/hold-status.enum';

@Entity('wallet_holds')
export class WalletHold extends BaseEntity {
  @Column()
  walletId: string;

  @ManyToOne(() => Wallet)
  @JoinColumn({ name: 'walletId' })
  wallet: Wallet;

  @Column()
  auctionId: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: HoldStatus, default: HoldStatus.HELD })
  status: HoldStatus;

  @Column({ unique: true, nullable: true })
  idempotencyKey: string | null;
}
