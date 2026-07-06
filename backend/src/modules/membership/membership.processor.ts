import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MembershipService } from './membership.service';

@Processor('membership')
export class MembershipProcessor extends WorkerHost {
  private readonly logger = new Logger(MembershipProcessor.name);

  constructor(private readonly membershipService: MembershipService) {
    super();
  }

  async process(job: Job<{ sellerId?: string }>) {
    switch (job.name) {
      case 'membership-renewal-check':
        if (job.data.sellerId) {
          await this.membershipService.handleRenewalDue(job.data.sellerId);
        }
        break;
      case 'membership-grace-expiry':
        await this.membershipService.expireGraceSubscriptions();
        break;
      default:
        this.logger.warn(`Unknown membership job: ${job.name}`);
    }
  }
}
