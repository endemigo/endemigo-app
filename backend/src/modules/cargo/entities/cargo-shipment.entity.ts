import { CargoProvider, CargoStatus } from '@endemigo/shared';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('cargo_shipments')
@Index(['orderId'], { unique: true })
@Index(['trackingNumber'], { unique: true })
export class CargoShipment extends BaseEntity {
  @Column()
  orderId: string;

  @Column({ unique: true })
  trackingNumber: string;

  @Column({ type: 'enum', enum: CargoProvider, default: CargoProvider.MOCK })
  provider: CargoProvider;

  @Column({ type: 'enum', enum: CargoStatus, default: CargoStatus.PREPARING })
  status: CargoStatus;

  @Column({ nullable: true })
  lastEventAt: Date | null;

  @Column({ nullable: true })
  deliveredAt: Date | null;
}
