import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RC } from '@endemigo/shared';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AdRequest } from '../ads/entities/ad-request.entity';
import { Campaign } from '../campaign/entities/campaign.entity';
import { MembershipSubscription } from '../membership/entities/membership-subscription.entity';
import { Order } from '../order/entities/order.entity';
import { Payment } from '../payment/entities/payment.entity';
import { AccountRestriction } from '../trust/entities/account-restriction.entity';
import { TrustFlag } from '../trust/entities/trust-flag.entity';
import { PayoutRequest } from '../wallet/entities/payout-request.entity';
import { ExportFormat, ExportService } from './export.service';

export type ReportType =
  | 'ads'
  | 'campaigns'
  | 'membership'
  | 'payouts'
  | 'orders'
  | 'payments'
  | 'trust';

export interface ReportQuery {
  page?: string | number;
  limit?: string | number;
  status?: string;
  source?: string;
  sellerId?: string;
  from?: string;
  to?: string;
  placementType?: string;
  campaignStatus?: string;
  membershipStatus?: string;
  restrictionStatus?: string;
}

type ReportEntity =
  | AdRequest
  | Campaign
  | MembershipSubscription
  | PayoutRequest
  | Order
  | Payment
  | TrustFlag
  | AccountRestriction;

interface ReportSource {
  repo: Repository<ReportEntity>;
  alias: string;
  hasSellerId: boolean;
  statusValue?: string;
  placementType?: string;
  sourceValue?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(AdRequest)
    private readonly adRequestRepo: Repository<AdRequest>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(MembershipSubscription)
    private readonly membershipRepo: Repository<MembershipSubscription>,
    @InjectRepository(PayoutRequest)
    private readonly payoutRepo: Repository<PayoutRequest>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(TrustFlag)
    private readonly trustFlagRepo: Repository<TrustFlag>,
    @InjectRepository(AccountRestriction)
    private readonly restrictionRepo: Repository<AccountRestriction>,
    private readonly exportService: ExportService,
  ) {}

  async getReport(type: ReportType, query: ReportQuery) {
    const { items, total, page, limit } = await this.loadRows(
      type,
      query,
      true,
    );
    return {
      code: RC.SUCCESS,
      message: 'Admin raporu getirildi',
      type,
      items,
      pagination: { page, limit, total },
      filters: query,
    };
  }

  async exportReport(
    type: ReportType,
    format: ExportFormat,
    query: ReportQuery,
  ) {
    const { items } = await this.loadRows(
      type,
      { ...query, page: 1, limit: 5000 },
      false,
    );
    const exported =
      format === 'csv'
        ? this.exportService.toCsv(items)
        : format === 'xlsx'
          ? this.exportService.toXlsx(items)
          : this.exportService.toPdf(items);

    return {
      code: RC.ADMIN_REPORT_EXPORTED,
      message: 'Admin raporu dışa aktarıldı',
      filename: `${type}-report.${exported.extension}`,
      ...exported,
    };
  }

  private async loadRows(
    type: ReportType,
    query: ReportQuery,
    paginated: boolean,
  ) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 25), 1), 5000);
    const source = this.resolveSource(type, query);
    const qb = source.repo.createQueryBuilder(source.alias);
    this.applyFilters(qb, source, query);
    qb.orderBy(`${source.alias}.createdAt`, 'DESC');

    if (paginated) {
      qb.skip((page - 1) * limit).take(limit);
    }

    const [rows, total] = await qb.getManyAndCount();
    return {
      items: rows.map((row) => this.normalizeRow(row)),
      total,
      page,
      limit,
    };
  }

  private resolveSource(type: ReportType, query: ReportQuery): ReportSource {
    if (type === 'ads') {
      return {
        repo: this.adRequestRepo as Repository<ReportEntity>,
        alias: 'ad',
        hasSellerId: true,
        statusValue: query.status,
        placementType: query.placementType,
      };
    }
    if (type === 'campaigns') {
      return {
        repo: this.campaignRepo as Repository<ReportEntity>,
        alias: 'campaign',
        hasSellerId: true,
        statusValue: query.campaignStatus ?? query.status,
      };
    }
    if (type === 'membership') {
      return {
        repo: this.membershipRepo as Repository<ReportEntity>,
        alias: 'membership',
        hasSellerId: true,
        statusValue: query.membershipStatus ?? query.status,
      };
    }
    if (type === 'payouts') {
      return {
        repo: this.payoutRepo as Repository<ReportEntity>,
        alias: 'payout',
        hasSellerId: true,
        statusValue: query.status,
      };
    }
    if (type === 'orders') {
      return {
        repo: this.orderRepo as Repository<ReportEntity>,
        alias: 'orderReport',
        hasSellerId: true,
        statusValue: query.status,
        sourceValue: query.source,
      };
    }
    if (type === 'payments') {
      return {
        repo: this.paymentRepo as Repository<ReportEntity>,
        alias: 'payment',
        hasSellerId: false,
        statusValue: query.status,
      };
    }
    if (type === 'trust') {
      const useRestrictions = Boolean(query.restrictionStatus);
      return {
        repo: (useRestrictions
          ? this.restrictionRepo
          : this.trustFlagRepo) as Repository<ReportEntity>,
        alias: useRestrictions ? 'restriction' : 'trustFlag',
        hasSellerId: true,
        statusValue: query.restrictionStatus ?? query.status,
      };
    }

    throw new BadRequestException({
      code: RC.VALIDATION_ERROR,
      message: 'Desteklenmeyen rapor tipi',
    });
  }

  private applyFilters(
    qb: SelectQueryBuilder<ReportEntity>,
    source: ReportSource,
    query: ReportQuery,
  ) {
    if (source.statusValue) {
      qb.andWhere(`${source.alias}.status = :status`, {
        status: source.statusValue,
      });
    }
    if (query.sellerId && source.hasSellerId) {
      qb.andWhere(`${source.alias}.sellerId = :sellerId`, {
        sellerId: query.sellerId,
      });
    }
    if (source.placementType) {
      qb.andWhere(`${source.alias}.placementType = :placementType`, {
        placementType: source.placementType,
      });
    }
    if (source.sourceValue) {
      qb.andWhere(`${source.alias}.source = :source`, {
        source: source.sourceValue,
      });
    }
    if (query.from) {
      qb.andWhere(`${source.alias}.createdAt >= :from`, {
        from: new Date(query.from),
      });
    }
    if (query.to) {
      qb.andWhere(`${source.alias}.createdAt <= :to`, {
        to: new Date(query.to),
      });
    }
  }

  private normalizeRow(row: ReportEntity): Record<string, unknown> {
    return JSON.parse(JSON.stringify(row)) as Record<string, unknown>;
  }
}
