import { InjectQueue } from '@nestjs/bullmq';
import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { CargoProvider, CargoStatus, RC } from '@endemigo/shared';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { CargoShipment } from './entities/cargo-shipment.entity';
import { MockCargoProvider } from './providers/mock-cargo.provider';

const ALLOWED_CARGO_TRANSITIONS: Record<CargoStatus, CargoStatus[]> = {
  [CargoStatus.PREPARING]: [CargoStatus.IN_TRANSIT, CargoStatus.CANCELLED, CargoStatus.FAILED],
  [CargoStatus.IN_TRANSIT]: [CargoStatus.DELIVERED, CargoStatus.FAILED],
  [CargoStatus.DELIVERED]: [],
  [CargoStatus.FAILED]: [],
  [CargoStatus.CANCELLED]: [],
};

@Injectable()
export class CargoService {
  constructor(
    @InjectRepository(CargoShipment)
    private readonly cargoShipmentRepository?: Repository<CargoShipment>,
    @InjectQueue('cargo')
    private readonly cargoQueue?: Queue,
    @Optional()
    private readonly mockCargoProvider?: MockCargoProvider,
    @Optional()
    private readonly configService?: ConfigService,
  ) {}

  async createMockShipment(orderId: string) {
    const trackingNumber = this.buildFallbackTrackingNumber(orderId);
    return {
      orderId,
      trackingNumber,
      provider: CargoProvider.MOCK,
      status: CargoStatus.PREPARING,
    };
  }

  async createShipmentForOrder(orderId: string) {
    const existing = await this.cargoShipmentRepository?.findOne({ where: { orderId } });
    if (existing) {
      return {
        code: RC.CARGO_TRACKING_CREATED,
        message: 'Cargo shipment already exists',
        shipment: existing,
      };
    }

    const trackingNumber = await this.generateTrackingNumber();
    const providerShipment = await this.mockCargoProvider?.createShipment({
      orderId,
      trackingNumber,
    });

    const shipment = this.cargoShipmentRepository?.create({
      orderId,
      trackingNumber,
      provider: CargoProvider.MOCK,
      status: providerShipment?.status ?? CargoStatus.PREPARING,
      lastEventAt: new Date(),
      deliveredAt: null,
    });
    const saved =
      shipment && this.cargoShipmentRepository
        ? await this.cargoShipmentRepository.save(shipment)
        : shipment;

    if (saved) {
      await this.enqueueTransitions(saved.id);
    }

    return {
      code: RC.CARGO_TRACKING_CREATED,
      message: 'Cargo shipment created',
      shipment: saved,
    };
  }

  async getShipmentForOrder(orderId: string) {
    const shipment = await this.cargoShipmentRepository?.findOne({ where: { orderId } });
    return {
      code: RC.CARGO_TRACKING_CREATED,
      message: 'Cargo shipment fetched',
      shipment,
    };
  }

  async transitionShipment(shipmentId: string, status: CargoStatus | string) {
    const nextStatus = status as CargoStatus;
    const shipment = await this.cargoShipmentRepository?.findOne({
      where: { id: shipmentId },
    });

    if (!shipment || shipment.status === nextStatus) {
      return { code: RC.CARGO_STATUS_TRANSITIONED, message: 'Cargo status unchanged', idempotent: true };
    }

    if (!ALLOWED_CARGO_TRANSITIONS[shipment.status].includes(nextStatus)) {
      throw new BadRequestException({
        code: RC.CARGO_STATUS_TRANSITIONED,
        message: 'Cargo status transition is not allowed',
      });
    }

    await this.mockCargoProvider?.transitionShipment(shipment.trackingNumber, nextStatus);
    shipment.status = nextStatus;
    shipment.lastEventAt = new Date();
    if (nextStatus === CargoStatus.DELIVERED) {
      shipment.deliveredAt = new Date();
    }
    const saved = await this.cargoShipmentRepository?.save(shipment);

    return {
      code: RC.CARGO_STATUS_TRANSITIONED,
      message: 'Cargo status transitioned',
      shipment: saved,
      idempotent: false,
    };
  }

  private async enqueueTransitions(shipmentId: string) {
    await this.cargoQueue?.add(
      'mark-in-transit',
      { shipmentId },
      {
        delay: this.getTransitDelayMs(),
        jobId: `cargo-transit-${shipmentId}`,
      },
    );
    await this.cargoQueue?.add(
      'mark-delivered',
      { shipmentId },
      {
        delay: this.getDeliveredDelayMs(),
        jobId: `cargo-delivered-${shipmentId}`,
      },
    );
  }

  private async generateTrackingNumber() {
    await this.cargoShipmentRepository?.manager.query(
      `SELECT pg_advisory_xact_lock(hashtext('mock_cargo_tracking'))`,
    );
    const now = new Date();
    const prefix = `MOCK-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count =
      (await this.cargoShipmentRepository
        ?.createQueryBuilder('shipment')
        .where('shipment.trackingNumber LIKE :prefix', { prefix: `${prefix}-%` })
        .getCount()) ?? 0;
    return `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }

  private buildFallbackTrackingNumber(orderId: string) {
    return `MOCK-${orderId}`;
  }

  private getTransitDelayMs() {
    return this.configService?.get<number>('MOCK_CARGO_TRANSIT_DELAY_MS') ?? 1000;
  }

  private getDeliveredDelayMs() {
    return this.configService?.get<number>('MOCK_CARGO_DELIVERED_DELAY_MS') ?? 2000;
  }
}
