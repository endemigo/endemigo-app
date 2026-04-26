import { CargoStatus } from '@endemigo/shared';

export interface CargoProviderCreateInput {
  orderId: string;
  trackingNumber: string;
}

export interface CargoProviderShipment {
  orderId: string;
  trackingNumber: string;
  provider: string;
  status: CargoStatus;
}

export interface CargoProvider {
  createShipment(input: CargoProviderCreateInput): Promise<CargoProviderShipment>;
  getStatus(trackingNumber: string): Promise<CargoStatus>;
  transitionShipment(trackingNumber: string, status: CargoStatus): Promise<CargoStatus>;
}
