import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CargoEventSource,
  CargoProvider,
  CargoShipmentType,
  CargoStatus,
  NotificationEventType,
  OrderStatus,
  RC,
} from '@endemigo/shared';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';
import { NotificationService } from '../notification/notification.service';
import { Order } from '../order/entities/order.entity';
import { User } from '../user/entities/user.entity';
import { EmailService } from '../../shared/email/email.service';
import { CargoShipmentEvent } from './entities/cargo-shipment-event.entity';
import { CargoShipment } from './entities/cargo-shipment.entity';
import { MockCargoProvider } from './providers/mock-cargo.provider';

const ALLOWED_CARGO_TRANSITIONS: Record<CargoStatus, CargoStatus[]> = {
  [CargoStatus.PREPARING]: [
    CargoStatus.IN_TRANSIT,
    CargoStatus.CANCELLED,
    CargoStatus.FAILED,
  ],
  [CargoStatus.IN_TRANSIT]: [CargoStatus.DELIVERED, CargoStatus.FAILED],
  [CargoStatus.DELIVERED]: [],
  [CargoStatus.FAILED]: [],
  [CargoStatus.CANCELLED]: [],
};

@Injectable()
export class CargoService {
  private readonly logger = new Logger(CargoService.name);

  constructor(
    @InjectRepository(CargoShipment)
    private readonly cargoShipmentRepository?: Repository<CargoShipment>,
    @InjectRepository(CargoShipmentEvent)
    private readonly cargoShipmentEventRepository?: Repository<CargoShipmentEvent>,
    @InjectQueue('cargo')
    private readonly cargoQueue?: Queue,
    @Optional()
    private readonly mockCargoProvider?: MockCargoProvider,
    @Optional()
    private readonly notificationService?: NotificationService,
    @Optional()
    private readonly configService?: ConfigService,
    @InjectRepository(Order)
    private readonly orderRepository?: Repository<Order>,
    @Optional()
    @InjectRepository(User)
    private readonly userRepository?: Repository<User>,
    @Optional()
    private readonly emailService?: EmailService,
  ) {}

  createMockShipment(orderId: string) {
    const trackingNumber = this.buildFallbackTrackingNumber(orderId);
    return {
      orderId,
      trackingNumber,
      provider: CargoProvider.MOCK,
      shipmentType: CargoShipmentType.FORWARD,
      status: CargoStatus.PREPARING,
    };
  }

  async createShipmentForOrder(orderId: string) {
    return this.createShipment(orderId, CargoShipmentType.FORWARD);
  }

  async createShipmentForOrderForUser(
    orderId: string,
    actor: { id: string; isAdmin?: boolean },
  ) {
    await this.assertSellerManagedOrder(orderId, actor);
    return this.createShipmentForOrder(orderId);
  }

  async createReturnShipmentForOrder(orderId: string) {
    return this.createShipment(orderId, CargoShipmentType.RETURN);
  }

  async createReturnShipmentForOrderForUser(
    orderId: string,
    actor: { id: string; isAdmin?: boolean },
  ) {
    await this.assertSellerManagedOrder(orderId, actor);
    return this.createReturnShipmentForOrder(orderId);
  }

  async getOrderShipmentsForUser(
    orderId: string,
    actor: { id: string; isAdmin?: boolean },
  ) {
    await this.assertOrderAccess(orderId, actor);

    const order = await this.orderRepository?.findOne({
      where: { id: orderId },
    });
    let shipments: CargoShipment[] = [];
    if (this.cargoShipmentRepository) {
      if (order && order.groupId && order.sellerId) {
        shipments = await this.cargoShipmentRepository.find({
          where: [
            { groupId: order.groupId, sellerId: order.sellerId },
            { orderId },
          ],
          order: { createdAt: 'ASC' },
        });
      } else {
        shipments = await this.cargoShipmentRepository.find({
          where: { orderId },
          order: { createdAt: 'ASC' },
        });
      }
    }

    return {
      code: RC.CARGO_TRACKING_FETCHED,
      message: 'Cargo shipments fetched',
      shipments,
    };
  }

  async getShipmentById(shipmentId: string) {
    const shipment = await this.cargoShipmentRepository?.findOne({
      where: { id: shipmentId },
    });

    return {
      code: RC.CARGO_TRACKING_FETCHED,
      message: 'Cargo shipment fetched',
      shipment: shipment ?? null,
    };
  }

  async getShipmentEventsForUser(
    shipmentId: string,
    actor: { id: string; isAdmin?: boolean },
  ) {
    const shipment = await this.requireShipment(shipmentId);
    if (shipment.orderId) {
      await this.assertOrderAccess(shipment.orderId, actor);
    } else {
      const orders = await this.getOrdersForShipment(shipment);
      if (orders.length > 0) {
        await this.assertOrderAccess(orders[0].id, actor);
      } else {
        throw new NotFoundException({
          code: RC.ORDER_NOT_FOUND,
          message: 'No orders associated with this shipment',
        });
      }
    }
    return this.getShipmentEvents(shipmentId);
  }

  async getShipmentEvents(shipmentId: string) {
    const events =
      this.cargoShipmentEventRepository &&
      'find' in this.cargoShipmentEventRepository
        ? await this.cargoShipmentEventRepository.find({
            where: { shipmentId },
            order: { occurredAt: 'ASC', createdAt: 'ASC' },
          })
        : [];

    return {
      code: RC.CARGO_EVENTS_FETCHED,
      message: 'Cargo shipment events fetched',
      events,
    };
  }

  async getShipmentForOrderForUser(
    orderId: string,
    actor: { id: string; isAdmin?: boolean },
  ) {
    await this.assertOrderAccess(orderId, actor);
    return this.getShipmentForOrder(orderId);
  }

  async getShipmentForOrder(orderId: string) {
    const order = await this.orderRepository?.findOne({
      where: { id: orderId },
    });
    let shipment: CargoShipment | null = null;
    if (order && order.groupId && order.sellerId) {
      shipment =
        (await this.cargoShipmentRepository?.findOne({
          where: {
            groupId: order.groupId,
            sellerId: order.sellerId,
            shipmentType: CargoShipmentType.FORWARD,
          },
        })) ?? null;
    }
    if (!shipment) {
      shipment =
        (await this.cargoShipmentRepository?.findOne({
          where: { orderId, shipmentType: CargoShipmentType.FORWARD },
        })) ?? null;
    }

    return {
      code: RC.CARGO_TRACKING_FETCHED,
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
      return {
        code: RC.CARGO_STATUS_TRANSITIONED,
        message: 'Cargo status unchanged',
        idempotent: true,
      };
    }

    if (!ALLOWED_CARGO_TRANSITIONS[shipment.status].includes(nextStatus)) {
      throw new BadRequestException({
        code: RC.CARGO_STATUS_TRANSITIONED,
        message: 'Cargo status transition is not allowed',
      });
    }

    await this.mockCargoProvider?.transitionShipment(
      shipment.trackingNumber,
      nextStatus,
    );

    shipment.status = nextStatus;
    shipment.lastEventAt = new Date();
    if (nextStatus === CargoStatus.DELIVERED) {
      shipment.deliveredAt = new Date();
    }

    const saved = await this.cargoShipmentRepository?.save(shipment);
    if (saved) {
      await this.recordShipmentEvent(
        saved,
        nextStatus,
        this.getEventTitle(nextStatus, saved.shipmentType),
        this.getEventDetail(nextStatus, saved.shipmentType),
      );
    }

    await this.notifyCargoStatusChanged(shipment, nextStatus);
    await this.syncOrderStatusForForwardShipment(shipment, nextStatus);
    await this.syncOrderStatusForReturnShipment(shipment, nextStatus);

    return {
      code: RC.CARGO_STATUS_TRANSITIONED,
      message: 'Cargo status transitioned',
      shipment: saved,
      idempotent: false,
    };
  }

  // Test/webhook simülasyonu: gerçek kargo entegrasyonunda taşıyıcı "delivered"
  // webhook'u çağırınca olacak şeyi taklit eder. Gidiş kargosunu DELIVERED yapar;
  // transitionShipment içindeki order senkronu order'ı IN_TRANSIT → DELIVERED
  // ilerletir (+ autoConfirmAt/alıcı onayı akışını başlatır). Satıcı elle teslim
  // işaretlemez.
  async simulateForwardDelivery(orderId: string) {
    const res = await this.getShipmentForOrder(orderId);
    const shipment = res?.shipment ?? null;
    if (!shipment) {
      throw new NotFoundException({
        code: RC.ORDER_NOT_FOUND,
        message: 'Bu sipariş için gidiş kargosu bulunamadı',
      });
    }
    if (shipment.status === CargoStatus.DELIVERED) {
      return {
        code: RC.CARGO_STATUS_TRANSITIONED,
        message: 'Kargo zaten teslim edildi',
        shipment,
        idempotent: true,
      };
    }
    if (shipment.status !== CargoStatus.IN_TRANSIT) {
      throw new BadRequestException({
        code: RC.CARGO_STATUS_TRANSITIONED,
        message:
          'Kargo teslim edilebilmesi için önce satıcı tarafından kargoya verilmelidir.',
      });
    }
    return this.transitionShipment(shipment.id, CargoStatus.DELIVERED);
  }

  private async createShipment(
    orderId: string,
    shipmentType: CargoShipmentType,
  ) {
    const order = await this.orderRepository?.findOne({
      where: { id: orderId },
    });
    if (!order) {
      throw new NotFoundException({
        code: RC.ORDER_NOT_FOUND,
        message: 'Order not found',
      });
    }

    let existing: CargoShipment | null = null;
    if (
      shipmentType === CargoShipmentType.FORWARD &&
      order.groupId &&
      order.sellerId
    ) {
      existing =
        (await this.cargoShipmentRepository?.findOne({
          where: {
            groupId: order.groupId,
            sellerId: order.sellerId,
            shipmentType,
          },
        })) ?? null;
    } else {
      existing =
        (await this.cargoShipmentRepository?.findOne({
          where: { orderId, shipmentType },
        })) ?? null;
    }

    if (existing) {
      return {
        code: RC.CARGO_TRACKING_CREATED,
        message: 'Cargo shipment already exists',
        shipment: existing,
      };
    }

    if (
      shipmentType === CargoShipmentType.FORWARD &&
      ![OrderStatus.ESCROW_HELD, OrderStatus.PREPARING_SHIPMENT].includes(
        order.status,
      )
    ) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Order is not ready for forward shipment',
      });
    }

    if (
      shipmentType === CargoShipmentType.RETURN &&
      order.status !== OrderStatus.RETURN_APPROVED
    ) {
      throw new BadRequestException({
        code: RC.ORDER_INVALID_TRANSITION,
        message: 'Order is not ready for return shipment',
      });
    }

    const trackingNumber = await this.generateTrackingNumber(shipmentType);
    const providerShipment = await this.mockCargoProvider?.createShipment({
      orderId,
      trackingNumber,
    });

    const isGroupedForward =
      shipmentType === CargoShipmentType.FORWARD && !!order.groupId;

    const shipment = this.cargoShipmentRepository?.create({
      orderId: isGroupedForward ? null : orderId,
      groupId: isGroupedForward ? order.groupId : null,
      sellerId: isGroupedForward ? order.sellerId : null,
      trackingNumber,
      provider: CargoProvider.MOCK,
      shipmentType,
      status: providerShipment?.status ?? CargoStatus.PREPARING,
      externalTrackingUrl: null,
      carrierReference: null,
      lastEventAt: new Date(),
      deliveredAt: null,
    });
    const saved =
      shipment && this.cargoShipmentRepository
        ? await this.cargoShipmentRepository.save(shipment)
        : shipment;

    if (saved) {
      await this.recordShipmentEvent(
        saved,
        saved.status,
        this.getEventTitle(saved.status, shipmentType),
        this.getEventDetail(saved.status, shipmentType),
      );
      await this.enqueueTransitions(saved.id);
    }

    return {
      code: RC.CARGO_TRACKING_CREATED,
      message: 'Cargo shipment created',
      shipment: saved,
    };
  }

  private async enqueueTransitions(shipmentId: string) {
    if (!this.cargoQueue) {
      // DI kuyruğu vermezse geçişler sessizce kaybolmasın.
      this.logger.warn(
        `Cargo kuyruğu yok; geçiş görevleri kurulamadı (shipment: ${shipmentId})`,
      );
      return;
    }
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

  private async generateTrackingNumber(shipmentType: CargoShipmentType) {
    const repositoryManager = this.cargoShipmentRepository?.manager;
    if (repositoryManager?.query) {
      await repositoryManager.query(
        `SELECT pg_advisory_xact_lock(hashtext('mock_cargo_tracking'))`,
      );
    }

    const now = new Date();
    const prefix = `${shipmentType === CargoShipmentType.RETURN ? 'RMA' : 'MOCK'}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const queryBuilder =
      this.cargoShipmentRepository?.createQueryBuilder?.('shipment');
    const count = queryBuilder
      ? ((await queryBuilder
          .where('shipment.trackingNumber LIKE :prefix', {
            prefix: `${prefix}-%`,
          })
          .getCount()) ?? 0)
      : 0;

    return `${prefix}-${String(count + 1).padStart(5, '0')}`;
  }

  private buildFallbackTrackingNumber(orderId: string) {
    return `MOCK-${orderId}`;
  }

  private async recordShipmentEvent(
    shipment: CargoShipment,
    status: CargoStatus,
    title: string,
    detail: string,
  ) {
    const event = this.cargoShipmentEventRepository?.create({
      shipmentId: shipment.id,
      status,
      title,
      detail,
      source: CargoEventSource.SYSTEM,
      occurredAt: new Date(),
    });

    if (event && this.cargoShipmentEventRepository) {
      await this.cargoShipmentEventRepository.save(event);
    }
  }

  private getEventTitle(status: CargoStatus, shipmentType: CargoShipmentType) {
    const shipmentLabel =
      shipmentType === CargoShipmentType.RETURN
        ? 'Return shipment'
        : 'Shipment';

    switch (status) {
      case CargoStatus.PREPARING:
        return `${shipmentLabel} created`;
      case CargoStatus.IN_TRANSIT:
        return `${shipmentLabel} in transit`;
      case CargoStatus.DELIVERED:
        return `${shipmentLabel} delivered`;
      case CargoStatus.CANCELLED:
        return `${shipmentLabel} cancelled`;
      case CargoStatus.FAILED:
        return `${shipmentLabel} failed`;
      default:
        return `${shipmentLabel} updated`;
    }
  }

  private getEventDetail(status: CargoStatus, shipmentType: CargoShipmentType) {
    const flow =
      shipmentType === CargoShipmentType.RETURN ? 'return cargo' : 'cargo';

    switch (status) {
      case CargoStatus.PREPARING:
        return `The ${flow} record has been created.`;
      case CargoStatus.IN_TRANSIT:
        return `The ${flow} is currently in transit.`;
      case CargoStatus.DELIVERED:
        return `The ${flow} has been delivered.`;
      case CargoStatus.CANCELLED:
        return `The ${flow} has been cancelled.`;
      case CargoStatus.FAILED:
        return `The ${flow} encountered a delivery failure.`;
      default:
        return `The ${flow} status has been updated.`;
    }
  }

  private async getOrdersForShipment(
    shipment: CargoShipment,
  ): Promise<Order[]> {
    if (!this.orderRepository) {
      return [];
    }
    if (shipment.orderId) {
      const order = await this.orderRepository.findOne({
        where: { id: shipment.orderId },
      });
      return order ? [order] : [];
    }
    if (shipment.groupId && shipment.sellerId) {
      return this.orderRepository.find({
        where: { groupId: shipment.groupId, sellerId: shipment.sellerId },
      });
    }
    return [];
  }

  private async assertOrderAccess(
    orderId: string,
    actor: { id: string; isAdmin?: boolean },
  ) {
    const order = await this.orderRepository?.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException({
        code: RC.ORDER_NOT_FOUND,
        message: 'Order not found',
      });
    }

    if (!actor.isAdmin && ![order.buyerId, order.sellerId].includes(actor.id)) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Shipment does not belong to authenticated user',
      });
    }

    return order;
  }

  private async assertSellerManagedOrder(
    orderId: string,
    actor: { id: string; isAdmin?: boolean },
  ) {
    const order = await this.assertOrderAccess(orderId, actor);

    if (!actor.isAdmin && order.sellerId !== actor.id) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Only the seller can manage shipment creation',
      });
    }

    return order;
  }

  private async requireShipment(shipmentId: string) {
    const shipment = await this.cargoShipmentRepository?.findOne({
      where: { id: shipmentId },
    });

    if (!shipment) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Cargo shipment not found',
      });
    }

    return shipment;
  }

  private async syncOrderStatusForForwardShipment(
    shipment: CargoShipment,
    nextStatus: CargoStatus,
  ) {
    if (
      shipment.shipmentType !== CargoShipmentType.FORWARD ||
      !this.orderRepository
    ) {
      return;
    }

    const orders = await this.getOrdersForShipment(shipment);
    for (const order of orders) {
      if (
        nextStatus === CargoStatus.IN_TRANSIT &&
        order.status === OrderStatus.ESCROW_HELD
      ) {
        order.status = OrderStatus.IN_TRANSIT;
        await this.orderRepository.save(order);
      } else if (
        nextStatus === CargoStatus.DELIVERED &&
        order.status === OrderStatus.IN_TRANSIT
      ) {
        order.status = OrderStatus.DELIVERED;
        order.deliveryConfirmedAt = new Date();
        const autoConfirmHours = this.getAutoConfirmHours();
        order.autoConfirmAt = new Date(
          Date.now() + autoConfirmHours * 60 * 60 * 1000,
        );
        await this.orderRepository.save(order);
      }
    }
  }

  private getAutoConfirmHours(): number {
    return this.configService?.get<number>('ESCROW_AUTO_CONFIRM_HOURS') ?? 72;
  }

  private async syncOrderStatusForReturnShipment(
    shipment: CargoShipment,
    nextStatus: CargoStatus,
  ) {
    if (
      shipment.shipmentType !== CargoShipmentType.RETURN ||
      !this.orderRepository
    ) {
      return;
    }

    if (!shipment.orderId) {
      return;
    }

    const order = await this.orderRepository.findOne({
      where: { id: shipment.orderId },
    });
    if (!order) {
      return;
    }

    if (
      nextStatus === CargoStatus.IN_TRANSIT &&
      order.status === OrderStatus.RETURN_APPROVED
    ) {
      order.status = OrderStatus.RETURN_IN_TRANSIT;
      await this.orderRepository.save(order);
      return;
    }

    if (
      nextStatus === CargoStatus.DELIVERED &&
      order.status === OrderStatus.RETURN_IN_TRANSIT
    ) {
      order.status = OrderStatus.RETURN_DELIVERED;
      order.returnDeliveredAt = new Date();
      await this.orderRepository.save(order);
    }
  }

  private async notifyCargoStatusChanged(
    shipment: CargoShipment,
    nextStatus: CargoStatus,
  ) {
    if (!this.orderRepository) {
      return;
    }

    const orders = await this.getOrdersForShipment(shipment);
    if (orders.length === 0) {
      return;
    }

    const recipientIds = new Set<string>();
    for (const order of orders) {
      if (order.buyerId) recipientIds.add(order.buyerId);
      if (order.sellerId) recipientIds.add(order.sellerId);
    }

    const recipientList = Array.from(recipientIds);

    if (this.notificationService) {
      await Promise.all(
        recipientList.map((userId) =>
          this.notificationService!.createFromEvent({
            eventId: `cargo-status:${shipment.id}:${nextStatus}:${userId}`,
            userId,
            eventType: NotificationEventType.CARGO_STATUS_CHANGED,
            title: this.getCargoEmailSubject(nextStatus, shipment.shipmentType),
            body: this.getCargoEmailSummary(nextStatus, shipment.shipmentType),
            relatedEntityType: 'order',
            relatedEntityId: orders[0].id,
          }),
        ),
      );
    }

    if (!this.emailService || !this.userRepository) {
      return;
    }

    const users = await this.userRepository.find({
      where: recipientList.map((id) => ({ id })),
      select: ['id', 'email'],
    });

    await Promise.all(
      users.map((user) =>
        this.emailService!.sendCargoLifecycleEmail({
          email: user.email,
          subject: this.getCargoEmailSubject(nextStatus, shipment.shipmentType),
          summary: this.getCargoEmailSummary(nextStatus, shipment.shipmentType),
          orderId: orders[0].id,
        }),
      ),
    );
  }

  private getCargoEmailSubject(
    status: CargoStatus,
    shipmentType: CargoShipmentType,
  ) {
    const prefix =
      shipmentType === CargoShipmentType.RETURN ? 'Return cargo' : 'Cargo';
    switch (status) {
      case CargoStatus.PREPARING:
        return `${prefix} created`;
      case CargoStatus.IN_TRANSIT:
        return `${prefix} is in transit`;
      case CargoStatus.DELIVERED:
        return `${prefix} delivered`;
      case CargoStatus.CANCELLED:
        return `${prefix} cancelled`;
      case CargoStatus.FAILED:
        return `${prefix} delivery failed`;
      default:
        return `${prefix} updated`;
    }
  }

  private getCargoEmailSummary(
    status: CargoStatus,
    shipmentType: CargoShipmentType,
  ) {
    const flow =
      shipmentType === CargoShipmentType.RETURN
        ? 'return shipment'
        : 'shipment';
    switch (status) {
      case CargoStatus.PREPARING:
        return `The ${flow} record has been created.`;
      case CargoStatus.IN_TRANSIT:
        return `The ${flow} is currently in transit.`;
      case CargoStatus.DELIVERED:
        return `The ${flow} has been delivered.`;
      case CargoStatus.CANCELLED:
        return `The ${flow} has been cancelled.`;
      case CargoStatus.FAILED:
        return `The ${flow} has failed.`;
      default:
        return `The ${flow} status has been updated.`;
    }
  }

  private getTransitDelayMs() {
    return (
      this.configService?.get<number>('MOCK_CARGO_TRANSIT_DELAY_MS') ?? 1000
    );
  }

  private getDeliveredDelayMs() {
    return (
      this.configService?.get<number>('MOCK_CARGO_DELIVERED_DELAY_MS') ?? 2000
    );
  }
}
