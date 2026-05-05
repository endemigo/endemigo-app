import { RC } from '@endemigo/shared';
import { AuctionController } from './auction.controller';
import { AuctionService } from './auction.service';

describe('AuctionController', () => {
  const createController = () => {
    const auctionService = {
      findAll: jest.fn().mockResolvedValue({
        code: 'AUCTION_LIST',
        message: 'Auctions fetched',
        items: [],
        total: 0,
        page: 1,
        totalPages: 0,
      }),
    } as unknown as AuctionService;

    return {
      controller: new AuctionController(auctionService),
      auctionService,
    };
  };

  it('rejects non-finite page query values', async () => {
    const { controller, auctionService } = createController();

    await expect(
      controller.findAll('abc' as never, '20' as never),
    ).rejects.toMatchObject({
      response: { code: RC.VALIDATION_ERROR },
    });
    expect(auctionService.findAll).not.toHaveBeenCalled();
  });

  it('rejects invalid auctionType query values', async () => {
    const { controller, auctionService } = createController();

    await expect(
      controller.findAll('1' as never, '20' as never, 'bad'),
    ).rejects.toMatchObject({
      response: { code: RC.VALIDATION_ERROR },
    });
    expect(auctionService.findAll).not.toHaveBeenCalled();
  });
});
