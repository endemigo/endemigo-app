import { BadRequestException } from '@nestjs/common';
import { AdRequestStatus, OrderSource, RC } from '@endemigo/shared';
import { ExportService } from './export.service';
import { ReportsService, ReportType } from './reports.service';

type QueryBuilderMock = {
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  skip: jest.Mock;
  take: jest.Mock;
  getManyAndCount: jest.Mock;
};

function createQueryBuilder(
  rows: Record<string, unknown>[],
  total = rows.length,
): QueryBuilderMock {
  const qb = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([rows, total]),
  };
  return qb;
}

function createRepo(qb: QueryBuilderMock) {
  return {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
  };
}

describe('ReportsService', () => {
  let qb: QueryBuilderMock;
  let exportService: ExportService;
  let service: ReportsService;

  beforeEach(() => {
    qb = createQueryBuilder([
      {
        id: 'ad-1',
        sellerId: 'seller-1',
        status: AdRequestStatus.ADMIN_REVIEW,
        createdAt: new Date('2026-04-28T00:00:00Z'),
      },
    ]);
    exportService = new ExportService();
    const repo = createRepo(qb);
    service = new ReportsService(
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      repo as never,
      exportService,
    );
  });

  it('returns paginated report rows with filters', async () => {
    const result = await service.getReport('ads', {
      page: 1,
      limit: 10,
      status: AdRequestStatus.ADMIN_REVIEW,
      sellerId: 'seller-1',
    });

    expect(result.code).toBe(RC.SUCCESS);
    expect(result.items[0].id).toBe('ad-1');
    expect(qb.andWhere).toHaveBeenCalledWith('ad.status = :status', {
      status: AdRequestStatus.ADMIN_REVIEW,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('ad.sellerId = :sellerId', {
      sellerId: 'seller-1',
    });
  });

  it('throws for invalid report type', async () => {
    await expect(
      service.getReport('invalid' as ReportType, {}),
    ).rejects.toThrow(BadRequestException);
  });

  it('exports an empty report dataset as CSV', async () => {
    qb.getManyAndCount.mockResolvedValueOnce([[], 0]);

    const result = await service.exportReport('ads', 'csv', {});

    expect(result.code).toBe(RC.ADMIN_REPORT_EXPORTED);
    expect(result.filename).toBe('ads-report.csv');
    expect(result.file.toString('utf8')).toBe('empty');
  });

  it('filters order reports by ASK_PRICE source', async () => {
    await service.getReport('orders', {
      source: OrderSource.ASK_PRICE,
    });

    expect(qb.andWhere).toHaveBeenCalledWith('orderReport.source = :source', {
      source: OrderSource.ASK_PRICE,
    });
  });
});
