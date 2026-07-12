import {
  CargoProvider,
  CargoShipmentType,
  CargoStatus,
} from '@endemigo/shared';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('cargo_shipments')
@Index(['orderId', 'shipmentType'], {
  unique: true,
  where: '"orderId" IS NOT NULL',
})
@Index(['groupId', 'sellerId', 'shipmentType'], {
  unique: true,
  where: '"groupId" IS NOT NULL AND "sellerId" IS NOT NULL',
})
@Index(['trackingNumber'], { unique: true })
export class CargoShipment extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @Column({ type: 'uuid', nullable: true })
  groupId: string | null;

  @Column({ type: 'uuid', nullable: true })
  sellerId: string | null;

  @Column({ unique: true })
  trackingNumber: string;

  @Column({ type: 'enum', enum: CargoProvider, default: CargoProvider.MOCK })
  provider: CargoProvider;

  @Column({
    type: 'enum',
    enum: CargoShipmentType,
    default: CargoShipmentType.FORWARD,
  })
  shipmentType: CargoShipmentType;

  @Column({ type: 'enum', enum: CargoStatus, default: CargoStatus.PREPARING })
  status: CargoStatus;

  @Column({ type: 'varchar', nullable: true })
  externalTrackingUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  carrierReference: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastEventAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;
}
