import { ForbiddenException } from '@nestjs/common';
import {
  CargoProvider,
  CargoShipmentType,
  CargoStatus,
  OrderStatus,
  RC,
} from '@endemigo/shared';
import { Repository } from 'typeorm';
import { NotificationService } from '../notification/notification.service';
import { Order } from '../order/entities/order.entity';
import { CargoShipmentEvent } from './entities/cargo-shipment-event.entity';
import { CargoShipment } from './entities/cargo-shipment.entity';
import { CargoService } from './cargo.service';
import { MockCargoProvider } from './providers/mock-cargo.provider';

const createCargoRepository = (shipment?: CargoShipment) =>
  ({
    findOne: jest.fn(() => Promise.resolve(shipment ?? null)),
    save: jest.fn((input: CargoShipment) => Promise.resolve(input)),
    create: jest.fn((input: Partial<CargoShipment>) => input as CargoShipment),
  }) as unknown as Repository<CargoShipment>;

const createCargoEventRepository = (events: CargoShipmentEvent[] = []) =>
  ({
    find: jest.fn(() => Promise.resolve(events)),
    save: jest.fn((input: CargoShipmentEvent) => Promise.resolve(input)),
    create: jest.fn(
      (input: Partial<CargoShipmentEvent>) => input as CargoShipmentEvent,
    ),
  }) as unknown as Repository<CargoShipmentEvent>;

const createOrderRepository = (order?: Partial<Order>) =>
  ({
    findOne: jest.fn(() => Promise.resolve(order ?? null)),
  }) as unknown as Repository<Order>;

describe('CargoService', () => {
  it('creates deterministic mock tracking records', () => {
    const service = new CargoService();

    const result = service.createMockShipment('order-1');

    expect(result.provider).toBe(CargoProvider.MOCK);
    expect(result.trackingNumber).toContain('MOCK');
    expect(result.shipmentType).toBe(CargoShipmentType.FORWARD);
  });

  it('rejects duplicate status transitions idempotently', async () => {
    const shipment = {
      id: 'shipment-1',
      orderId: 'order-1',
      trackingNumber: 'MOCK-1',
      provider: CargoProvider.MOCK,
      status: CargoStatus.IN_TRANSIT,
      lastEventAt: new Date(),
      deliveredAt: null,
    } as CargoShipment;
    const service = new CargoService(createCargoRepository(shipment));

    const result = await service.transitionShipment(
      'shipment-1',
      CargoStatus.IN_TRANSIT,
    );

    expect(result.idempotent).toBe(true);
  });

  it('sends cargo status notifications to buyer and seller users, not the order id', async () => {
    const shipment = {
      id: 'shipment-1',
      orderId: 'order-1',
      trackingNumber: 'MOCK-1',
      provider: CargoProvider.MOCK,
      status: CargoStatus.PREPARING,
      lastEventAt: new Date(),
      deliveredAt: null,
    } as CargoShipment;
    const createFromEvent = jest.fn(() =>
      Promise.resolve({
        code: RC.NOTIFICATION_CREATED,
        message: 'Notification created',
      }),
    );
    const notificationService = {
      createFromEvent,
    } as unknown as NotificationService;
    const mockCargoProvider = {
      transitionShipment: jest.fn(),
    } as unknown as MockCargoProvider;
    const orderRepository = createOrderRepository({
      id: 'order-1',
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
    });
    const service = new CargoService(
      createCargoRepository(shipment),
      undefined,
      undefined,
      mockCargoProvider,
      notificationService,
      undefined,
      orderRepository,
    );

    const result = await service.transitionShipment(
      'shipment-1',
      CargoStatus.IN_TRANSIT,
    );

    expect(result.code).toBe(RC.CARGO_STATUS_TRANSITIONED);
    expect(createFromEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'buyer-1' }),
    );
    expect(createFromEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'seller-1' }),
    );
    expect(createFromEvent).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'order-1' }),
    );
  });

  it('creates a return shipment record for completed orders', async () => {
    const createShipment = jest.fn(() =>
      Promise.resolve({
        provider: CargoProvider.MOCK,
        status: CargoStatus.PREPARING,
      }),
    );
    const mockCargoProvider = {
      createShipment,
    } as unknown as MockCargoProvider;
    const service = new CargoService(
      createCargoRepository(),
      createCargoEventRepository(),
      undefined,
      mockCargoProvider,
      undefined,
      undefined,
      createOrderRepository({
        id: 'order-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
        status: OrderStatus.RETURN_APPROVED,
      }),
    );

    const result = await service.createReturnShipmentForOrder('order-1');

    expect(result.shipment?.shipmentType).toBe(CargoShipmentType.RETURN);
    expect(createShipment).toHaveBeenCalled();
  });

  it('returns shipment events for matching shipment ids', async () => {
    const service = new CargoService(
      createCargoRepository(),
      createCargoEventRepository([
        {
          id: 'event-1',
          shipmentId: 'shipment-1',
          status: CargoStatus.PREPARING,
          title: 'Created',
          detail: 'Shipment created',
          source: 'system',
          occurredAt: new Date(),
        } as CargoShipmentEvent,
      ]),
    );

    const result = await service.getShipmentEvents('shipment-1');

    expect(result.events).toHaveLength(1);
    expect(result.events[0].shipmentId).toBe('shipment-1');
  });

  it('rejects shipment access for unrelated users', async () => {
    const service = new CargoService(
      createCargoRepository({
        id: 'shipment-1',
        orderId: 'order-1',
        trackingNumber: 'MOCK-1',
        provider: CargoProvider.MOCK,
        shipmentType: CargoShipmentType.FORWARD,
        status: CargoStatus.PREPARING,
        lastEventAt: new Date(),
        deliveredAt: null,
      } as CargoShipment),
      createCargoEventRepository(),
      undefined,
      undefined,
      undefined,
      undefined,
      createOrderRepository({
        id: 'order-1',
        buyerId: 'buyer-1',
        sellerId: 'seller-1',
      }),
    );

    await expect(
      service.getOrderShipmentsForUser('order-1', {
        id: 'stranger-1',
        isAdmin: false,
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
