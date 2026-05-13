import { NegotiationProcessor } from './negotiation.processor';

describe('NegotiationProcessor', () => {
  it('expires offer for expire-offer jobs', async () => {
    const negotiationService = {
      expireOffer: jest.fn().mockResolvedValue(undefined),
      archiveInactiveConversation: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new NegotiationProcessor(negotiationService as never);

    await processor.process({
      name: 'expire-offer',
      data: { offerId: 'offer-1' },
    } as never);

    expect(negotiationService.expireOffer).toHaveBeenCalledWith('offer-1');
  });

  it('archives inactive conversation for archive jobs', async () => {
    const negotiationService = {
      expireOffer: jest.fn().mockResolvedValue(undefined),
      archiveInactiveConversation: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new NegotiationProcessor(negotiationService as never);

    await processor.process({
      name: 'archive-inactive',
      data: { conversationId: 'conversation-1' },
    } as never);

    expect(negotiationService.archiveInactiveConversation).toHaveBeenCalledWith('conversation-1');
  });
});
