import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

export enum TokenType {
  EMAIL_VERIFICATION = 'EMAIL_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
}

@Entity('verification_tokens')
export class VerificationToken extends BaseEntity {
  @Column()
  userId: string;

  @Column({ unique: true })
  token: string;

  @Column({ type: 'enum', enum: TokenType })
  type: TokenType;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ default: false })
  isUsed: boolean;
}
