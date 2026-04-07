import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AuctionService } from './auction.service';

@Processor('auction')
export class AuctionProcessor extends WorkerHost {
  private readonly logger = new Logger(AuctionProcessor.name);

  constructor(private readonly auctionService: AuctionService) {
    super();
  }

  async process(job: Job<{ auctionId: string }>) {
    const { auctionId } = job.data;

    switch (job.name) {
      case 'start-auction':
        this.logger.log(`Starting auction ${auctionId}`);
        await this.auctionService.activateAuction(auctionId);
        break;

      case 'end-auction':
        this.logger.log(`Ending auction ${auctionId}`);
        await this.auctionService.finalizeAuction(auctionId);
        break;

      default:
        this.logger.warn(`Unknown job: ${job.name}`);
    }
  }
}
