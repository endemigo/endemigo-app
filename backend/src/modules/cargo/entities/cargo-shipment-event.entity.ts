import { CargoEventSource, CargoStatus } from '@endemigo/shared';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('cargo_shipment_events')
@Index(['shipmentId', 'occurredAt'])
export class CargoShipmentEvent extends BaseEntity {
  @Column()
  shipmentId: string;

  @Column({ type: 'enum', enum: CargoStatus })
  status: CargoStatus;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  detail: string | null;

  @Column({
    type: 'enum',
    enum: CargoEventSource,
    default: CargoEventSource.SYSTEM,
  })
  source: CargoEventSource;

  @Column({ type: 'timestamptz' })
  occurredAt: Date;
}
