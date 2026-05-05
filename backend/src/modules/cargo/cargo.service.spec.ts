import { CargoProvider, CargoStatus, RC } from '@endemigo/shared';
import { Repository } from 'typeorm';
import { NotificationService } from '../notification/notification.service';
import { Order } from '../order/entities/order.entity';
import { CargoShipment } from './entities/cargo-shipment.entity';
import { CargoService } from './cargo.service';
import { MockCargoProvider } from './providers/mock-cargo.provider';

const createCargoRepository = (shipment?: CargoShipment) =>
  ({
    findOne: jest.fn(() => Promise.resolve(shipment ?? null)),
    save: jest.fn((input: CargoShipment) => Promise.resolve(input)),
    create: jest.fn((input: Partial<CargoShipment>) => input as CargoShipment),
  }) as unknown as Repository<CargoShipment>;

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
});
