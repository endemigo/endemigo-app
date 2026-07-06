import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuctionStatus } from '@endemigo/shared';
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
    job: Job<{
      auctionId?: string;
      eventId?: string;
      nextLotId?: string;
      minutesLeft?: number;
      errorMessage?: string;
    }>,
  ) {
    const { eventId, nextLotId } = job.data;
    const auctionId = job.data.auctionId as string;

    try {

      switch (job.name) {
        case 'start-next-lot': {
          this.logger.log(`Starting next lot ${nextLotId} for event ${eventId}`);
          if (eventId && nextLotId) {
            await this.auctionService.startNextLot(eventId, nextLotId);
          }
          break;
        }

        case 'start-auction': {
          this.logger.log(`Starting auction ${auctionId}`);
          const activated = await this.auctionService.activateAuction(auctionId);

          // Retry senaryosu: önceki denemede aktivasyon başarılı olup uyarı
          // planlaması patlamış olabilir. Aktivasyon dönmediyse müzayedeyi
          // yükle; hâlâ ACTIVE ise uyarıları (deterministik jobId ile) kur.
          const auction =
            activated ?? (await this.auctionService.findAuctionById(auctionId));
          if (!auction || auction.status !== AuctionStatus.ACTIVE) break;

          if (activated) {
            // AUCT-ABS: absentee çözümlemesi fiyatı açmış olabilir.
            this.auctionGateway.emitAuctionStarted(auctionId, {
              startPrice: Number(auction.startPrice),
              currentPrice: Number(auction.currentPrice),
              bidCount: auction.bidCount ?? 0,
            }, (auction as any).eventId);
          }

          // Schedule warning events (5min, 1min before end)
          const warningEventId = (auction as any).eventId ?? null;
          const endMs = new Date(auction.endTime).getTime();
          const warn5 = endMs - 5 * 60 * 1000 - Date.now();
          const warn1 = endMs - 1 * 60 * 1000 - Date.now();

          if (warn5 > 0) {
            await this.auctionQueue.add(
              'warning',
              { auctionId, minutesLeft: 5, eventId: warningEventId },
              { delay: warn5, jobId: `warn5-${auctionId}` },
            );
          }
          if (warn1 > 0) {
            await this.auctionQueue.add(
              'warning',
              { auctionId, minutesLeft: 1, eventId: warningEventId },
              { delay: warn1, jobId: `warn1-${auctionId}` },
            );
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

        case 'winner-payment-reminder': {
          this.logger.log(`Sending winner payment reminder for ${auctionId}`);
          await this.auctionService.sendWinnerPaymentReminder(auctionId);
          break;
        }

        case 'winner-payment-expiry': {
          this.logger.log(`Processing winner payment expiry for ${auctionId}`);
          await this.auctionService.processWinnerPaymentExpiry(auctionId);
          break;
        }

        case 'warning': {
          const minutesLeft = job.data.minutesLeft || 1;
          this.logger.log(
            `Warning for auction ${auctionId}: ${minutesLeft} minute(s) left`,
          );
          // eventId olmadan yalnız auction odası duyurulur; ortak müzayede
          // (Model 2) ekranları event odasında dinler.
          this.auctionGateway.emitAuctionWarning(
            auctionId,
            { minutesLeft },
            job.data.eventId ?? null,
          );
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
