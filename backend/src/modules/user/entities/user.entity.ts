import { Entity, Column, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SellerProfile } from './seller-profile.entity';
import { encrypt, decrypt } from '../../../common/utils/crypto.util';

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true, unique: true })
  phone: string;

  // ─── Phase 5 Prerequisite Fields ──────────────────────
  @Column({ nullable: true })
  birthDate: Date;

  // WR-02: KVKK — TC Kimlik No şifrelenerek saklanır (AES-256-GCM)
  @Column({
    nullable: true,
    transformer: {
      to: (value: string | null) => value ? encrypt(value) : null,
      from: (value: string | null) => value ? decrypt(value) : null,
    },
  })
  tcKimlikNo: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true, default: 'TR' })
  nationality: string;

  @Column({ default: false })
  isSeller: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  bio: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  bannerUrl: string;

  @OneToOne(() => SellerProfile, (sp) => sp.user, { eager: false })
  sellerProfile: SellerProfile;
  // NOT: Admin tablosu Phase 11'de ayrı entity olarak oluşturulacak.
}
