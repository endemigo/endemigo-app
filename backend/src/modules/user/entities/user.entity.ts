import { Entity, Column, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SellerProfile } from './seller-profile.entity';

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

  @Column({ default: false })
  isSeller: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @OneToOne(() => SellerProfile, (sp) => sp.user, { eager: false })
  sellerProfile: SellerProfile;
  // NOT: Admin tablosu Phase 11'de ayrı entity olarak oluşturulacak.
}
