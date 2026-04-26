import { Injectable } from '@nestjs/common';
import { CargoProvider as CargoProviderEnum, CargoStatus } from '@endemigo/shared';
import {
  CargoProvider,
  CargoProviderCreateInput,
  CargoProviderShipment,
} from './cargo-provider.interface';

@Injectable()
export class MockCargoProvider implements CargoProvider {
  private readonly statuses = new Map<string, CargoStatus>();

  async createShipment(input: CargoProviderCreateInput): Promise<CargoProviderShipment> {
    this.statuses.set(input.trackingNumber, CargoStatus.PREPARING);
    return {
      orderId: input.orderId,
      trackingNumber: input.trackingNumber,
      provider: CargoProviderEnum.MOCK,
      status: CargoStatus.PREPARING,
    };
  }

  async getStatus(trackingNumber: string): Promise<CargoStatus> {
    return this.statuses.get(trackingNumber) ?? CargoStatus.PREPARING;
  }

  async transitionShipment(
    trackingNumber: string,
    status: CargoStatus,
  ): Promise<CargoStatus> {
    this.statuses.set(trackingNumber, status);
    return status;
  }
}
