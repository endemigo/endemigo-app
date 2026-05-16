import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { User } from './user.entity';
import { AddressType } from '../../../shared/types/address-type.enum';

@Entity('addresses')
export class Address extends BaseEntity {
  @Column()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: AddressType })
  type: AddressType;

  @Column()
  title: string; // "Ev", "İş" vb.

  @Column()
  fullName: string;

  @Column()
  phone: string;

  @Column()
  city: string;

  @Column()
  district: string;

  @Column({ type: 'varchar', nullable: true })
  neighborhood: string | null;

  @Column({ type: 'text' })
  addressLine: string;

  @Column({ type: 'varchar', nullable: true })
  postalCode: string | null;

  @Column({ default: 'TR' })
  country: string;

  @Column({ default: false })
  isDefault: boolean;
}
