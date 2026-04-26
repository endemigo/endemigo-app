import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrderService } from './order.service';

@Processor('order')
export class OrderProcessor extends WorkerHost {
  private readonly logger = new Logger(OrderProcessor.name);

  constructor(private readonly orderService: OrderService) {
    super();
  }

  async process(job: Job<{ orderId: string }>) {
    try {
      switch (job.name) {
        case 'auto-confirm-delivery':
          await this.orderService.autoConfirmDelivery(job.data.orderId);
          break;
        default:
          this.logger.warn(`Unknown order job: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process order job ${job.name} for ${job.data.orderId}: ${error}`,
      );
      throw error;
    }
  }
}
