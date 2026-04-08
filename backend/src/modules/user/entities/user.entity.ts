import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

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

  @Column({ default: false })
  isSeller: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;
  // NOT: Admin tablosu Phase 11'de ayrı entity olarak oluşturulacak.
  // User entity'de isAdmin flag kullanılmayacak.
}
