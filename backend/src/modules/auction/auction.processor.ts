import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuctionService } from './auction.service';
import { AuctionGateway } from './auction.gateway';

@Processor('auction')
export class AuctionProcessor extends WorkerHost {
  private readonly logger = new Logger(AuctionProcessor.name);

  constructor(
    private readonly auctionService: AuctionService,
    private readonly auctionGateway: AuctionGateway,
    @InjectQueue('auction')
    private readonly auctionQueue: Queue,
  ) {
    super();
  }

  async process(
    job: Job<{ auctionId: string; minutesLeft?: number; errorMessage?: string }>,
  ) {
    const { auctionId } = job.data;

    try {
      switch (job.name) {
        case 'start-auction': {
          this.logger.log(`Starting auction ${auctionId}`);
          const auction = await this.auctionService.activateAuction(auctionId);

          if (auction) {
            this.auctionGateway.emitAuctionStarted(auctionId, {
              startPrice: Number(auction.startPrice),
            });

            // Schedule warning events (5min, 1min before end)
            const endMs = new Date(auction.endTime).getTime();
            const warn5 = endMs - 5 * 60 * 1000 - Date.now();
            const warn1 = endMs - 1 * 60 * 1000 - Date.now();

            if (warn5 > 0) {
              await this.auctionQueue.add(
                'warning',
                { auctionId, minutesLeft: 5 },
                { delay: warn5 },
              );
            }
            if (warn1 > 0) {
              await this.auctionQueue.add(
                'warning',
                { auctionId, minutesLeft: 1 },
                { delay: warn1 },
              );
            }
          }
          break;
        }

        case 'end-auction': {
          this.logger.log(`Ending auction ${auctionId}`);
          // Gateway events are emitted inside finalizeAuction
          await this.auctionService.finalizeAuction(auctionId);
          break;
        }

        case 'auction-finalization-compensation': {
          this.logger.log(`Retrying finalization side effects for ${auctionId}`);
          await this.auctionService.retryFinalizationSideEffects(auctionId);
          break;
        }

        case 'warning': {
          const minutesLeft = job.data.minutesLeft || 1;
          this.logger.log(
            `Warning for auction ${auctionId}: ${minutesLeft} minute(s) left`,
          );
          this.auctionGateway.emitAuctionWarning(auctionId, { minutesLeft });
          break;
        }

        default:
          this.logger.warn(`Unknown job: ${job.name}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process job ${job.name} for auction ${auctionId} (attempt ${job.attemptsMade + 1}/${job.opts.attempts || 1}): ${error}`,
      );
      throw error; // Re-throw so BullMQ can retry
    }
  }
}
