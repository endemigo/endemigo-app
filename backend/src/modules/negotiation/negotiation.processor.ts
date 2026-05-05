import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NegotiationService } from './negotiation.service';

@Processor('negotiation')
export class NegotiationProcessor extends WorkerHost {
  constructor(private readonly negotiationService: NegotiationService) {
    super();
  }

  async process(job: Job<{ offerId?: string; conversationId?: string }>) {
    if (job.name === 'expire-offer' && job.data.offerId) {
      await this.negotiationService.expireOffer(job.data.offerId);
    }
    if (job.name === 'archive-inactive' && job.data.conversationId) {
      await this.negotiationService.archiveInactiveConversation(
        job.data.conversationId,
      );
    }
  }
}
