import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { CargoStatus } from '@endemigo/shared';
import { Job } from 'bullmq';
import { CargoService } from './cargo.service';

@Processor('cargo')
export class CargoProcessor extends WorkerHost {
  private readonly logger = new Logger(CargoProcessor.name);

  constructor(private readonly cargoService?: CargoService) {
    super();
  }

  async process(job: Job<{ shipmentId: string }>) {
    try {
      switch (job.name) {
        case 'mark-in-transit':
          await this.cargoService?.transitionShipment(
            job.data.shipmentId,
            CargoStatus.IN_TRANSIT,
          );
          break;
        case 'mark-delivered':
          await this.cargoService?.transitionShipment(
            job.data.shipmentId,
            CargoStatus.DELIVERED,
          );
          break;
        default:
          this.logger.warn(`Unknown cargo job: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(`Failed to process cargo job ${job.name}: ${error}`);
      throw error;
    }
  }

  buildTransitionJobId(shipmentId: string, status: string) {
    return `cargo:${shipmentId}:${status}`;
  }
}
