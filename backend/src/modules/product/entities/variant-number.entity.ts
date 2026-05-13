import { Column, Entity } from 'typeorm';
import { VariantNumberStatus, VariantOptionKind } from '@endemigo/shared';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('variant_numbers')
export class VariantNumber extends BaseEntity {
  @Column({
    type: 'enum',
    enum: VariantOptionKind,
    default: VariantOptionKind.NUMBER,
  })
  kind: VariantOptionKind;

  @Column()
  nameTr: string;

  @Column()
  nameEn: string;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({
    type: 'enum',
    enum: VariantNumberStatus,
    default: VariantNumberStatus.ACTIVE,
  })
  status: VariantNumberStatus;

  @Column({ type: 'varchar', length: 16, nullable: true })
  swatchHex: string | null;
}
