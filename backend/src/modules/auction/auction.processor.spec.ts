import { Job } from 'bullmq';
import { AuctionGateway } from './auction.gateway';
import { AuctionProcessor } from './auction.processor';
import { AuctionService } from './auction.service';

describe('AuctionProcessor', () => {
  const createProcessor = () => {
    const auctionService = {
      activateAuction: jest.fn(),
      finalizeAuction: jest.fn(),
      retryFinalizationSideEffects: jest.fn(),
    } as unknown as AuctionService & {
      retryFinalizationSideEffects: jest.Mock;
    };
    const auctionGateway = {
      emitAuctionStarted: jest.fn(),
      emitAuctionWarning: jest.fn(),
    } as unknown as AuctionGateway;
    const auctionQueue = {
      add: jest.fn(),
    };

    return {
      processor: new AuctionProcessor(
        auctionService,
        auctionGateway,
        auctionQueue as never,
      ),
      auctionService,
    };
  };

  it('processes finalization compensation jobs idempotently', async () => {
    const { processor, auctionService } = createProcessor();
    const job = {
      name: 'auction-finalization-compensation',
      data: { auctionId: 'auction-1', errorMessage: 'wallet down' },
      attemptsMade: 0,
      opts: { attempts: 5 },
    } as Job<{ auctionId: string; errorMessage: string }>;

    await processor.process(job);

    expect(auctionService.retryFinalizationSideEffects).toHaveBeenCalledWith(
      'auction-1',
    );
  });
});
