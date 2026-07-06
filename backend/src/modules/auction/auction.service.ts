import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
  Optional,
  OnApplicationBootstrap,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Not, Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Auction } from './entities/auction.entity';
import { Bid } from './entities/bid.entity';
import { AuctionEvent } from './entities/auction-event.entity';
import { AuctionRegistration } from './entities/auction-registration.entity';
import { AuctionEventInvitation } from './entities/auction-event-invitation.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { AuctionStatus } from '../../shared/types/auction-status.enum';
import { AuctionType } from '../../shared/types/auction-type.enum';
import { AuctionRegistrationStatus } from '@endemigo/shared';
import { BidStatus } from '../../shared/types/bid-status.enum';
import { AuctionGateway } from './auction.gateway';
import { WalletService } from '../wallet/wallet.service';
import { UserService } from '../user/user.service';
import { CreateAuctionDto, UpdateAuctionDto, PlaceBidDto, RegisterToAuctionDto } from './dto/auction.dto';
import { OrderService } from '../order/order.service';
import {
  AuctionPaymentStatus,
  NotificationEventType,
  RC,
  AuctionApprovalStatus,
  AuctionEventStatus,
  AuctionEventSystemType,
  JointManagementType,
  InvitationStatus,
  ProductStatus,
} from '@endemigo/shared';

import { NotificationService } from '../notification/notification.service';
import { PaymentService } from '../payment/payment.service';
import { ProductService } from '../product/product.service';


const WINNER_PAYMENT_WINDOW_HOURS = 24;
const WINNER_PAYMENT_REMINDER_HOURS = 1;
const MAX_FALLBACK_ROUNDS = 1;

type AuctionProductOwnership = {
  id: string;
  sellerId: string;
};

@Injectable()
export class AuctionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuctionService.name);

  constructor(
    @InjectRepository(Auction)
    private readonly auctionRepo: Repository<Auction>,
    @InjectRepository(Bid)
    private readonly bidRepo: Repository<Bid>,
    @InjectRepository(AuctionRegistration)
    private readonly registrationRepo: Repository<AuctionRegistration>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    @InjectQueue('auction')
    private readonly auctionQueue: Queue,
    private readonly dataSource: DataSource,
    private readonly auctionGateway: AuctionGateway,
    private readonly walletService: WalletService,
    private readonly userService: UserService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    @Optional()
    @Inject(forwardRef(() => ProductService))
    private readonly productService?: ProductService,
    @Optional()
    private readonly orderService?: OrderService,
    @Optional()
    private readonly notificationService?: NotificationService,
  ) {}


  async onApplicationBootstrap() {
    this.logger.log('Müzayede durumu eşitleme ve kurtarma motoru başlatılıyor...');
    try {
      await this.reconcileActiveAuctions();
      await this.reconcilePublishedAuctions();
      await this.reconcilePendingPayments();
    } catch (err) {
      this.logger.error(`Kurtarma motoru çalışırken hata oluştu: ${err}`);
    }
  }

  /**
   * Kuyruktaki işi (varsa) kaldırır. "İş yok / çoktan işlendi" normaldir;
   * gerçek hatalar (ör. Redis erişimi) debug'da izlenebilsin diye loglanır.
   */
  private async removeQueueJob(jobId: string): Promise<void> {
    try {
      const job = await this.auctionQueue.getJob(jobId);
      if (job) await job.remove();
    } catch (error) {
      this.logger.debug(`Kuyruk işi kaldırılamadı (${jobId}): ${error}`);
    }
  }

  /**
   * Publish sonrası start/end görevleri kaybolmuş (Redis hatası, restart,
   * silinmiş kuyruk) PUBLISHED müzayedeleri yeniden planlar. Event lotları
   * (eventId dolu) lot akışıyla yönetilir ve duraklatılmış lot da PUBLISHED
   * göründüğünden bilerek kapsam dışıdır.
   */
  private async reconcilePublishedAuctions() {
    const publishedAuctions = await this.auctionRepo.find({
      where: { status: AuctionStatus.PUBLISHED, eventId: IsNull() },
    });

    for (const auction of publishedAuctions) {
      try {
        const now = Date.now();
        const jobs = [
          {
            name: 'start-auction',
            delay: Math.max(0, new Date(auction.startTime).getTime() - now),
            jobId: `start-${auction.id}`,
          },
          {
            name: 'end-auction',
            delay: Math.max(0, new Date(auction.endTime).getTime() - now),
            jobId: `end-${auction.id}`,
          },
        ];
        for (const jobSpec of jobs) {
          await this.removeQueueJob(jobSpec.jobId);
          await this.auctionQueue.add(
            jobSpec.name,
            { auctionId: auction.id },
            { delay: jobSpec.delay, jobId: jobSpec.jobId },
          );
        }
        this.logger.log(
          `PUBLISHED müzayede görevleri yeniden kuruldu: ${auction.id}`,
        );
      } catch (err) {
        this.logger.error(
          `PUBLISHED müzayede (${auction.id}) planlaması başarısız: ${err}`,
        );
      }
    }
  }

  private async reconcileActiveAuctions() {
    const activeAuctions = await this.auctionRepo.find({
      where: { status: AuctionStatus.ACTIVE }
    });

    for (const auction of activeAuctions) {
      const now = new Date();
      if (auction.endTime <= now) {
        this.logger.warn(`Sunucu kapalıyken süresi dolan lot sonlandırılıyor: ${auction.id}`);
        try {
          await this.finalizeAuction(auction.id);
        } catch (err) {
          this.logger.error(`Aktif lot (${auction.id}) sonlandırılırken hata: ${err}`);
        }
      } else {
        const delay = auction.endTime.getTime() - now.getTime();
        this.logger.log(`Aktif lot için bitiş görevi yeniden planlanıyor: ${auction.id} (Kalan: ${Math.round(delay / 1000)}sn)`);
        try {
          // Remove old job if exists
          await this.removeQueueJob(`end-${auction.id}`);
          
          await this.auctionQueue.add(
            'end-auction',
            { auctionId: auction.id },
            { delay, jobId: `end-${auction.id}` }
          );
        } catch (err) {
          this.logger.error(`Aktif lot (${auction.id}) BullMQ planlaması başarısız: ${err}`);
        }
      }
    }
  }

  private async reconcilePendingPayments() {
    const pendingAuctions = await this.auctionRepo.find({
      where: { 
        status: AuctionStatus.ENDED,
        winnerPaymentStatus: AuctionPaymentStatus.PENDING 
      }
    });

    for (const auction of pendingAuctions) {
      if (!auction.winnerPaymentDeadlineAt) continue;

      const now = new Date();
      if (auction.winnerPaymentDeadlineAt <= now) {
        this.logger.warn(`Ödeme süresi geçen lot için yedek alıcı akışı başlatılıyor: ${auction.id}`);
        try {
          await this.processWinnerPaymentExpiry(auction.id);
        } catch (err) {
          this.logger.error(`Ödeme süresi geçen lot (${auction.id}) işlenirken hata: ${err}`);
        }
      } else {
        this.logger.log(`Ödeme zaman aşımı görevi yeniden planlanıyor: ${auction.id}`);
        try {
          // Remove old jobs if exists
          const round = auction.fallbackRound;
          await this.removeQueueJob(`winner-payment-expiry-${auction.id}-r${round}`);
          await this.removeQueueJob(`winner-payment-reminder-${auction.id}-r${round}`);

          await this.scheduleWinnerPaymentJobs(
            auction.id,
            auction.winnerPaymentDeadlineAt,
            auction.fallbackRound
          );
        } catch (err) {
          this.logger.error(`Ödeme görevleri (${auction.id}) planlanırken hata: ${err}`);
        }
      }
    }
  }

  // ─── Apply to Event (Model 2) ───────────────────────────

  // Etkinliğe ürün başvurusunun tüm ön koşulları (tek ürün ve toplu yükleme
  // aynı kuralları kullanır). addingCount: bu istekte eklenmek istenen lot sayısı.
  private async assertEventApplicationAllowed(
    sellerId: string,
    eventId: string,
    guaranteeAccepted: boolean | undefined,
    addingCount: number,
  ): Promise<AuctionEvent> {
    const user = await this.userService.findById(sellerId);
    if (!user?.isSeller) {
      throw new ForbiddenException({
        code: RC.NOT_SELLER,
        message: 'Sadece satıcılar müzayede başvurusunda bulunabilir',
      });
    }

    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Müzayede etkinliği bulunamadı',
      });
    }

    // Get seller profile for pre-contract acceptance check
    const profileRes = await this.userService.getSellerProfile(sellerId);
    const profile = profileRes.sellerProfile;

    // Validate based on event system type
    if (event.eventType === AuctionEventSystemType.ENDEMIGO_MANAGED) {
      if (event.status !== AuctionEventStatus.APPLICATION) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Bu müzayede etkinliği başvurulara kapalı',
        });
      }

      // Check product count limit (max 5)
      const existingCount = await this.auctionRepo.count({
        where: { eventId, sellerId },
      });
      if (existingCount + addingCount > 5) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Endemigo müzayedelerine en fazla 5 ürün ile katılabilirsiniz',
        });
      }

      if (!guaranteeAccepted) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Ürünlerin menşei ve tedarik garantisini vermeniz zorunludur',
        });
      }
    } else if (event.eventType === AuctionEventSystemType.INDEPENDENT) {
      if (![AuctionEventStatus.DRAFT, AuctionEventStatus.APPLICATION].includes(event.status)) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Bu müzayede etkinliği başvurulara kapalı',
        });
      }

      if (event.ownerId !== sellerId) {
        throw new ForbiddenException({
          code: RC.FORBIDDEN,
          message: 'Sadece kendi oluşturduğunuz bağımsız müzayedelere ürün ekleyebilirsiniz',
        });
      }

      if (!profile.independentPreContractAcceptedAt) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Müzayede oluşturabilmek için önce ön sözleşmeyi kabul etmelisiniz',
        });
      }

      if (!guaranteeAccepted) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Ürünlerin menşei ve tedarik garantisini vermeniz zorunludur',
        });
      }
    } else if (event.eventType === AuctionEventSystemType.JOINT) {
      if (![AuctionEventStatus.DRAFT, AuctionEventStatus.APPLICATION].includes(event.status)) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Bu müzayede etkinliği başvurulara kapalı',
        });
      }

      if (!profile.jointPreContractAcceptedAt) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Ortak müzayede katılımı için önce ön sözleşmeyi kabul etmelisiniz',
        });
      }

      if (!guaranteeAccepted) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Ürünlerin menşei ve tedarik garantisini vermeniz zorunludur',
        });
      }

      // Sahip değilse: kabul edilmiş davet YA DA açık çağrı (+ ≥20 aktif ürün) gerekir.
      if (event.ownerId !== sellerId) {
        const invitation = await this.auctionRepo.manager.findOne(AuctionEventInvitation, {
          where: { eventId, inviteeId: sellerId, status: InvitationStatus.ACCEPTED },
        });
        if (!invitation) {
          if (!event.openCallEnabled) {
            throw new ForbiddenException({
              code: RC.FORBIDDEN,
              message: 'Bu ortak müzayedeye katılmak için davet edilmeli ve kabul etmelisiniz',
            });
          }
          const applicantProductCount = await this.auctionRepo.manager.count('Product', {
            where: { sellerId, status: ProductStatus.ACTIVE },
          });
          if (applicantProductCount < 20) {
            throw new ForbiddenException({
              code: RC.FORBIDDEN,
              message: 'Açık çağrıya katılmak için en az 20 aktif ürününüz olmalıdır',
            });
          }
        }
      }
    }

    if (event.submissionDeadline && new Date() > new Date(event.submissionDeadline)) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Bu müzayede etkinliği için son ürün ekleme tarihi geçmiştir',
      });
    }

    return event;
  }

  async applyToEvent(sellerId: string, eventId: string, dto: CreateAuctionDto) {
    const event = await this.assertEventApplicationAllowed(
      sellerId,
      eventId,
      dto.guaranteeAccepted,
      1,
    );

    // BIZ-03: Product ownership check
    const product = (await this.auctionRepo.manager.findOne('Product', {
      where: { id: dto.productId },
    })) as AuctionProductOwnership | null;
    if (!product) {
      throw new NotFoundException({
        code: RC.PRODUCT_NOT_FOUND,
        message: 'Ürün bulunamadı',
      });
    }
    if (product.sellerId !== sellerId) {
      throw new ForbiddenException({
        code: RC.NOT_PRODUCT_OWNER,
        message: 'Sadece kendi ürünleriniz için müzayede oluşturabilirsiniz',
      });
    }

    // Check product not already in an active or published auction
    const existingAuction = await this.auctionRepo
      .createQueryBuilder('a')
      .where('a.productId = :productId', { productId: dto.productId })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [AuctionStatus.ACTIVE, AuctionStatus.PUBLISHED],
      })
      .getOne();
    if (existingAuction) {
      throw new BadRequestException({
        code: RC.ACTIVE_AUCTION_EXISTS,
        message: 'Bu ürün zaten aktif veya yayında bir müzayedede',
      });
    }


    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const lotNumber = await this.generateLotNumber(queryRunner.manager);

      const auction = this.auctionRepo.create({
        productId: dto.productId,
        sellerId,
        eventId,
        startPrice: dto.startPrice,
        currentPrice: dto.startPrice,
        minIncrement: dto.minIncrement || 1,
        reservePrice: dto.reservePrice ?? null,
        reserveMet: false,
        auctionType: event.auctionType, // Etkinlik türünü miras alır
        antiSnipingEnabled: event.antiSnipingEnabled ?? (dto.antiSnipingEnabled ?? true),
        extensionSeconds: event.extensionSeconds ?? (dto.extensionSeconds ?? 60),
        maxExtensions: event.maxExtensions ?? (dto.maxExtensions ?? 5),
        extensionDuration: event.extensionDuration ?? 60,
        culturalAssetRestricted: dto.culturalAssetRestricted ?? false,
        status: AuctionStatus.DRAFT,
        approvalStatus: AuctionApprovalStatus.PENDING, // Onay bekliyor
        startTime: event.startTime, // Etkinlik başlangıç zamanını miras alır
        endTime: event.endTime,
        lotNumber,
        guaranteeAcceptedAt: dto.guaranteeAccepted ? new Date() : null,
      });

      const saved = await queryRunner.manager.save(Auction, auction);
      await queryRunner.commitTransaction();
      return {
        code: RC.AUCTION_CREATED,
        message: 'Müzayede etkinliği başvurusu alındı',
        id: saved.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Toplu lot yükleme (Excel): ürün + lot tek adımda ────
  // Satır bazlı hata raporu: hatalı satır partiyi durdurmaz ({ created, failed[] }).
  async bulkImportLots(
    sellerId: string,
    eventId: string,
    dto: { guaranteeAccepted?: boolean; lots: Record<string, unknown>[] },
  ) {
    if (!this.productService) {
      throw new BadRequestException({
        code: RC.INTERNAL_ERROR,
        message: 'Ürün servisi kullanılamıyor',
      });
    }

    const rows = dto.lots ?? [];
    if (!rows.length) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Yüklenecek satır bulunamadı',
      });
    }

    const event = await this.assertEventApplicationAllowed(
      sellerId,
      eventId,
      dto.guaranteeAccepted,
      rows.length,
    );

    const failed: { row: number; reason: string }[] = [];
    // Satır → oluşturulan kayıt eşlemesi; görsel yükleme adımı productId ile devam eder.
    const createdLots: {
      row: number;
      productId: string;
      auctionId: string;
      lotNumber: string;
    }[] = [];
    let created = 0;

    for (const [index, rawRow] of rows.entries()) {
      const row = index + 1;
      try {
        // Lot alanları: açılış fiyatı zorunlu (yoksa ürün fiyatı kullanılır).
        const startPriceRaw = rawRow.startPrice ?? rawRow.price;
        const startPrice = Number(startPriceRaw);
        if (!Number.isFinite(startPrice) || startPrice <= 0) {
          throw new BadRequestException({
            code: RC.VALIDATION_ERROR,
            message: 'Açılış fiyatı (startPrice) pozitif bir sayı olmalıdır',
          });
        }

        const minIncrementRaw = rawRow.minIncrement;
        const minIncrement =
          minIncrementRaw === undefined ||
          minIncrementRaw === null ||
          String(minIncrementRaw).trim() === ''
            ? 1
            : Number(minIncrementRaw);
        if (!Number.isFinite(minIncrement) || minIncrement <= 0) {
          throw new BadRequestException({
            code: RC.VALIDATION_ERROR,
            message: 'Artış miktarı (minIncrement) pozitif bir sayı olmalıdır',
          });
        }

        const reservePriceRaw = rawRow.reservePrice;
        const reservePrice =
          reservePriceRaw === undefined ||
          reservePriceRaw === null ||
          String(reservePriceRaw).trim() === ''
            ? null
            : Number(reservePriceRaw);
        if (reservePrice !== null && !Number.isFinite(reservePrice)) {
          throw new BadRequestException({
            code: RC.VALIDATION_ERROR,
            message: 'Rezerv fiyat (reservePrice) sayısal olmalıdır',
          });
        }
        if (reservePrice !== null && reservePrice < startPrice) {
          throw new BadRequestException({
            code: RC.VALIDATION_ERROR,
            message: 'Rezerv fiyat açılış fiyatından düşük olamaz',
          });
        }

        // Ürün: mevcut toplu içe aktarma doğrulamasıyla oluşturulur (DRAFT).
        const rowDto = await this.productService.buildBulkImportRowDto(rawRow);
        rowDto.status = ProductStatus.DRAFT;
        const productRes = await this.productService.create(sellerId, rowDto);
        const productId = (productRes as { id?: string }).id;
        if (!productId) {
          throw new BadRequestException({
            code: RC.INTERNAL_ERROR,
            message: 'Ürün oluşturulamadı',
          });
        }

        // Lot: LOT numaralama ve insert aynı transaction içinde (D-12).
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
          const lotNumber = await this.generateLotNumber(queryRunner.manager);
          const auction = this.auctionRepo.create({
            productId,
            sellerId,
            eventId,
            startPrice,
            currentPrice: startPrice,
            minIncrement,
            reservePrice,
            reserveMet: false,
            auctionType: event.auctionType,
            antiSnipingEnabled: event.antiSnipingEnabled ?? true,
            extensionSeconds: event.extensionSeconds ?? 60,
            maxExtensions: event.maxExtensions ?? 5,
            extensionDuration: event.extensionDuration ?? 60,
            culturalAssetRestricted: false,
            status: AuctionStatus.DRAFT,
            approvalStatus: AuctionApprovalStatus.PENDING,
            startTime: event.startTime,
            endTime: event.endTime,
            lotNumber,
            guaranteeAcceptedAt: new Date(),
          });
          const savedLot = await queryRunner.manager.save(Auction, auction);
          await queryRunner.commitTransaction();
          createdLots.push({
            row,
            productId,
            auctionId: savedLot.id,
            lotNumber: savedLot.lotNumber,
          });
        } catch (lotError) {
          await queryRunner.rollbackTransaction();
          throw lotError;
        } finally {
          await queryRunner.release();
        }

        created++;
      } catch (error) {
        const reason =
          (error as { response?: { message?: string } })?.response?.message ||
          (error as Error)?.message ||
          'Bilinmeyen hata';
        failed.push({ row, reason });
      }
    }

    return {
      code: RC.SUCCESS,
      message: `${created} lot eklendi, ${failed.length} satır başarısız`,
      created,
      failed,
      createdLots,
    };
  }

  // ─── Create (D-18: DRAFT status, no BullMQ jobs) ─────────

  async create(sellerId: string, dto: CreateAuctionDto) {
    const user = await this.userService.findById(sellerId);
    if (!user?.isSeller) {
      throw this.forbidden(
        RC.NOT_SELLER,
        'Sadece satıcılar müzayede oluşturabilir',
      );
    }

    // BIZ-03: Product ownership check
    const product = (await this.auctionRepo.manager.findOne('Product', {
      where: { id: dto.productId },
    })) as AuctionProductOwnership | null;
    if (!product) {
      throw this.notFound(RC.PRODUCT_NOT_FOUND, 'Ürün bulunamadı');
    }
    if (product.sellerId !== sellerId) {
      throw this.forbidden(
        RC.NOT_PRODUCT_OWNER,
        'Sadece kendi ürünleriniz için müzayede oluşturabilirsiniz',
      );
    }

    // BIZ-07: Check product not in active OR published auction
    const existingAuction = await this.auctionRepo
      .createQueryBuilder('a')
      .where('a.productId = :productId', { productId: dto.productId })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [AuctionStatus.ACTIVE, AuctionStatus.PUBLISHED],
      })
      .getOne();
    if (existingAuction) {
      throw this.badRequest(
        RC.ACTIVE_AUCTION_EXISTS,
        'Bu ürün zaten aktif veya yayında bir müzayedede',
      );
    }

    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);

    if (endTime <= startTime) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Bitiş zamanı başlangıçtan sonra olmalı',
      );
    }

    if (dto.reservePrice !== undefined && dto.reservePrice < dto.startPrice) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Reserve price başlangıç fiyatından düşük olamaz',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // D-12: LOT numaralama ve insert aynı transaction içinde kalmalı.
      const lotNumber = await this.generateLotNumber(queryRunner.manager);

      // D-18: DRAFT status — BullMQ jobs are NOT created yet
      const auction = this.auctionRepo.create({
        productId: dto.productId,
        sellerId,
        startPrice: dto.startPrice,
        currentPrice: dto.startPrice,
        minIncrement: dto.minIncrement || 1,
        reservePrice: dto.reservePrice ?? null,
        reserveMet: false,
        auctionType: dto.auctionType || AuctionType.REALTIME,
        antiSnipingEnabled: dto.antiSnipingEnabled ?? true,
        extensionSeconds: dto.extensionSeconds ?? 60,
        maxExtensions: dto.maxExtensions ?? 5,
        culturalAssetRestricted: dto.culturalAssetRestricted ?? false,
        status: AuctionStatus.DRAFT,
        startTime,
        endTime,
        lotNumber,
        guaranteeAcceptedAt: dto.guaranteeAccepted ? new Date() : null,
      });

      const saved = await queryRunner.manager.save(Auction, auction);
      await queryRunner.commitTransaction();
      return {
        code: RC.AUCTION_CREATED,
        message: 'Auction created',
        ...(await this.loadAuctionResponse(saved.id)),
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── Publish (D-18: DRAFT → PUBLISHED, schedule BullMQ) ──

  async publishAuction(auctionId: string, sellerId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction)
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    if (auction.sellerId !== sellerId) {
      throw this.forbidden(RC.FORBIDDEN, 'Bu müzayede size ait değil');
    }
    if (auction.status !== AuctionStatus.DRAFT) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Sadece taslak müzayedeler yayınlanabilir',
      );
    }

    if (new Date(auction.startTime) <= new Date()) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Başlangıç zamanı gelecekte olmalı',
      );
    }

    if (new Date(auction.endTime) <= new Date(auction.startTime)) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Bitiş zamanı başlangıçtan sonra olmalı',
      );
    }

    // BIZ-07 kontrolü create anında yapılır ama aynı ürüne birden çok DRAFT
    // açılabilir; publish anında tekrar doğrulanmazsa ürün iki canlı
    // müzayedeye girer.
    const conflictingAuction = await this.auctionRepo
      .createQueryBuilder('a')
      .where('a.productId = :productId', { productId: auction.productId })
      .andWhere('a.id != :id', { id: auction.id })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [AuctionStatus.ACTIVE, AuctionStatus.PUBLISHED],
      })
      .getOne();
    if (conflictingAuction) {
      throw this.badRequest(
        RC.ACTIVE_AUCTION_EXISTS,
        'Bu ürün zaten aktif veya yayında bir müzayedede',
      );
    }

    auction.status = AuctionStatus.PUBLISHED;
    await this.auctionRepo.save(auction);

    // Schedule BullMQ jobs
    const now = Date.now();
    await this.auctionQueue.add(
      'start-auction',
      { auctionId },
      {
        delay: Math.max(0, new Date(auction.startTime).getTime() - now),
        jobId: `start-${auctionId}`,
      },
    );
    await this.auctionQueue.add(
      'end-auction',
      { auctionId },
      {
        delay: Math.max(0, new Date(auction.endTime).getTime() - now),
        jobId: `end-${auctionId}`,
      },
    );

    return {
      code: RC.AUCTION_PUBLISHED,
      message: 'Auction published',
      ...(await this.loadAuctionResponse(auctionId)),
    };
  }

  // ─── Update Draft ─────────────────────────────────────────

  async updateDraft(
    auctionId: string,
    sellerId: string,
    dto: UpdateAuctionDto,
  ) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction)
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    if (auction.sellerId !== sellerId) {
      throw this.forbidden(RC.FORBIDDEN, 'Bu müzayede size ait değil');
    }
    if (auction.status !== AuctionStatus.DRAFT) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Sadece taslak müzayedeler düzenlenebilir',
      );
    }

    // WR-05: Product cannot be changed after auction creation
    if ('productId' in dto) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Müzayedenin ürünü değiştirilemez',
      );
    }

    // Etkinliğe bağlı lotlar etkinlik takvimini miras alır — tekil lotta
    // tarih değişikliği akış senkronunu bozar, sadece fiyat alanları serbest.
    if (auction.eventId && (dto.startTime || dto.endTime)) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Etkinliğe bağlı lotların tarihleri etkinlikten yönetilir, tekil olarak değiştirilemez',
      );
    }

    // Zaman ve fiyat alanları tek tek güncellenebildiğinden çapraz kurallar
    // güncel + mevcut değerlerin birleşimi üzerinden doğrulanmalı.
    const newStartTime = dto.startTime
      ? new Date(dto.startTime)
      : new Date(auction.startTime);
    const newEndTime = dto.endTime
      ? new Date(dto.endTime)
      : new Date(auction.endTime);
    if (newEndTime <= newStartTime) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Bitiş zamanı başlangıçtan sonra olmalı',
      );
    }

    const newStartPrice =
      dto.startPrice !== undefined ? dto.startPrice : Number(auction.startPrice);
    const newReservePrice =
      dto.reservePrice !== undefined
        ? dto.reservePrice
        : auction.reservePrice !== null && auction.reservePrice !== undefined
          ? Number(auction.reservePrice)
          : null;
    if (newReservePrice !== null && newReservePrice < newStartPrice) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Reserve price başlangıç fiyatından düşük olamaz',
      );
    }

    if (dto.startTime) auction.startTime = newStartTime;
    if (dto.endTime) auction.endTime = newEndTime;
    if (dto.startPrice !== undefined) {
      auction.startPrice = dto.startPrice;
      auction.currentPrice = dto.startPrice;
    }
    if (dto.reservePrice !== undefined) {
      auction.reservePrice = dto.reservePrice;
      auction.reserveMet = false;
    }
    if (dto.minIncrement !== undefined) auction.minIncrement = dto.minIncrement;
    if (dto.auctionType !== undefined) auction.auctionType = dto.auctionType;
    if (dto.antiSnipingEnabled !== undefined)
      auction.antiSnipingEnabled = dto.antiSnipingEnabled;
    if (dto.extensionSeconds !== undefined)
      auction.extensionSeconds = dto.extensionSeconds;
    if (dto.maxExtensions !== undefined)
      auction.maxExtensions = dto.maxExtensions;

    await this.auctionRepo.save(auction);
    return {
      code: RC.AUCTION_UPDATED,
      message: 'Auction updated',
      ...(await this.loadAuctionResponse(auctionId)),
    };
  }

  // ─── Cancel (D-08, BIZ-17) ────────────────────────────────

  async cancelAuction(auctionId: string, sellerId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction)
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    if (auction.sellerId !== sellerId) {
      throw this.forbidden(RC.FORBIDDEN, 'Bu müzayede size ait değil');
    }

    if (auction.bidCount > 0) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Teklif almış müzayede sadece admin tarafından iptal edilebilir',
      );
    }

    if (
      ![
        AuctionStatus.DRAFT,
        AuctionStatus.PUBLISHED,
        AuctionStatus.ACTIVE,
      ].includes(auction.status)
    ) {
      throw this.badRequest(RC.VALIDATION_ERROR, 'Bu müzayede iptal edilemez');
    }

    auction.status = AuctionStatus.CANCELLED;
    await this.auctionRepo.save(auction);

    // AUCT-ABS: bekleyen ön teklifler askıda kalmasın (hold'ları yok).
    await this.bidRepo.update(
      { auctionId, status: BidStatus.ABSENTEE },
      { status: BidStatus.CANCELLED },
    );

    // Clean up BullMQ jobs
    await this.removeQueueJob(`start-${auctionId}`);
    await this.removeQueueJob(`end-${auctionId}`);

    // Gateway event (Plan 05-04, Task 4)
    this.auctionGateway.emitAuctionCancelled(auctionId, {
      reason: 'Satıcı tarafından iptal edildi',
    });

    return {
      code: RC.AUCTION_CANCELLED,
      message: 'Auction cancelled',
      auctionId,
    };
  }

  // ─── Admin Cancel ─────────────────────────────────────────
  // Teklif almış/bitmiş müzayedelerde iptal sadece status değişimi değildir:
  // hold'lar, zamanlanmış işler ve kazananın sepet kalemi de temizlenmeli.
  async adminCancelAuction(auctionId: string, reason?: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction)
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');

    if (
      [
        AuctionStatus.CANCELLED,
        AuctionStatus.COMPLETED,
        AuctionStatus.FAILED,
      ].includes(auction.status)
    ) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Bu durumdaki müzayede iptal edilemez',
      );
    }

    auction.status = AuctionStatus.CANCELLED;
    auction.winnerId = null;
    auction.winningBidId = null;
    auction.winnerPaymentStatus = AuctionPaymentStatus.NONE;
    auction.winnerPaymentDeadlineAt = null;
    auction.winnerPaymentCompletedAt = null;
    auction.orderId = null;
    await this.auctionRepo.save(auction);

    // Canlı teklif satırları kapanır; OUTBID/EXPIRED geçmişi denetim için kalır.
    await this.bidRepo.update(
      {
        auctionId,
        status: In([BidStatus.ACTIVE, BidStatus.ABSENTEE, BidStatus.WON]),
      },
      { status: BidStatus.CANCELLED },
    );

    const jobIds = [`start-${auctionId}`, `end-${auctionId}`];
    for (let i = 1; i <= (auction.currentExtensions ?? 0); i++) {
      jobIds.push(`end-${auctionId}-ext${i}`);
    }
    const round = auction.fallbackRound ?? 0;
    jobIds.push(
      `winner-payment-expiry-${auctionId}-r${round}`,
      `winner-payment-reminder-${auctionId}-r${round}`,
    );
    for (const jobId of jobIds) {
      await this.removeQueueJob(jobId);
    }

    // Finalize kazananın sepetine lot eklemiş olabilir
    await this.cartItemRepo.delete({ auctionId });

    await this.walletService.releaseAllHoldsForAuction(auctionId);

    this.auctionGateway.emitAuctionCancelled(auctionId, {
      reason: reason || 'Müzayede yönetimi tarafından iptal edildi',
    });
    this.auctionGateway.clearViewerCount(auctionId);

    return {
      code: RC.AUCTION_CANCELLED,
      message: 'Auction cancelled by admin',
      auctionId,
      auction,
    };
  }

  // ─── Admin Finalize ───────────────────────────────────────
  // Scheduler job'ı düşer/kaybolursa müzayede süresiz ACTIVE kalır; bu uç
  // restart beklemeden elle sonlandırma sağlar. endTime öne çekilir çünkü
  // finalizeAuction'daki orphan-guard geçmiş endTime şartı arar.
  async adminFinalizeAuction(auctionId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction)
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');

    if (auction.status !== AuctionStatus.ACTIVE) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Sadece aktif müzayede sonlandırılabilir',
      );
    }

    if (auction.endTime > new Date()) {
      auction.endTime = new Date(Date.now() - 1000);
      await this.auctionRepo.save(auction);
    }

    const jobIds = [`end-${auctionId}`];
    for (let i = 1; i <= (auction.currentExtensions ?? 0); i++) {
      jobIds.push(`end-${auctionId}-ext${i}`);
    }
    for (const jobId of jobIds) {
      await this.removeQueueJob(jobId);
    }

    const finalized = await this.finalizeAuction(auctionId, true);
    if (!finalized) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Müzayede sonlandırılamadı; durumu değişmiş olabilir',
      );
    }

    return {
      code: RC.SUCCESS,
      message: 'Auction finalized by admin',
      auctionId,
      auction: finalized,
    };
  }

  // ─── List ─────────────────────────────────────────────────

  async findAll(page = 1, limit = 20, auctionType?: AuctionType, productId?: string) {
    // BIZ-13: Only show public-visible statuses
    const qb = this.auctionRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('a.seller', 'seller')
      .where('a.status IN (:...statuses)', {
        statuses: [
          AuctionStatus.PUBLISHED,
          AuctionStatus.ACTIVE,
          AuctionStatus.ENDED,
        ],
      });

    if (auctionType) {
      qb.andWhere('a.auctionType = :auctionType', { auctionType });
    }

    if (productId) {
      qb.andWhere('a.productId = :productId', { productId });
    }

    const [items, total] = await qb
      .orderBy('a.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      code: RC.AUCTION_LIST,
      message: 'Auctions fetched',
      items: items.map((a) => this.toResponse(a)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findEvents(status?: AuctionEventStatus, page = 1, limit = 20) {
    const qb = this.auctionRepo.manager.createQueryBuilder(AuctionEvent, 'e')
      .leftJoinAndSelect('e.category', 'category');
    if (status) {
      qb.where('e.status = :status', { status });
    }
    
    const [items, total] = await qb
      .orderBy('e.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      code: RC.SUCCESS,
      message: 'Auction events fetched',
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findEventDetails(id: string) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id },
      relations: ['category'],
    });
    if (!event) {
      throw this.notFound(RC.NOT_FOUND, 'Müzayede etkinliği bulunamadı');
    }

    const lots = await this.auctionRepo.find({
      where: {
        eventId: id,
        approvalStatus: AuctionApprovalStatus.APPROVED,
      },
      relations: ['product', 'seller'],
      order: { sequenceNumber: 'ASC' },
    });

    const mappedLots = lots.map((lot) => {
      const resp = this.toResponse(lot);
      if (
        lot.status === AuctionStatus.PUBLISHED &&
        lot.pausedRemainingSeconds !== null &&
        lot.pausedRemainingSeconds !== undefined
      ) {
        (resp as any).pausedRemainingSeconds = lot.pausedRemainingSeconds;
      }
      return resp;
    });

    return {
      code: RC.SUCCESS,
      message: 'Müzayede etkinliği detayları getirildi',
      event,
      lots: mappedLots,
    };
  }

  async findById(id: string) {
    return {
      code: RC.AUCTION_FETCHED,
      message: 'Auction fetched',
      ...(await this.loadAuctionResponse(id)),
    };
  }

  private async loadAuctionResponse(id: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id },
      relations: ['product', 'product.category', 'seller', 'winner'],
    });
    if (!auction)
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    return this.toResponse(auction);
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ Plan 05-03: PlaceBid with Transaction Lock (D-02) ════
  // ═══════════════════════════════════════════════════════════

  async placeBid(auctionId: string, bidderId: string, dto: PlaceBidDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Lock auction row (D-02: Pessimistic Lock — SELECT FOR UPDATE)
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!auction)
        throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');

      const bidder = await this.userService.findById(bidderId);
      if (!bidder?.isActive) {
        throw new ForbiddenException({
          code: RC.ACCOUNT_DISABLED,
          message: 'Kullanıcı bulunamadı veya devre dışı',
        });
      }

      // Check bidding limit (Deposit-backed Bidding Limit check)
      const wonUnpaidAuctions = await queryRunner.manager.find(Auction, {
        where: {
          winnerId: bidderId,
          winnerPaymentStatus: AuctionPaymentStatus.PENDING,
        }
      });
      const wonUnpaidTotal = wonUnpaidAuctions.reduce((sum, a) => sum + Number(a.currentPrice), 0);

      // Active exposure = auctions where this bidder currently holds the live
      // leading bid. auction.winnerId is only persisted at finalization, so it
      // is null during live bidding and cannot be used here; derive the set
      // from the bidder's active winning bids instead.
      const activeLeadingBids = await queryRunner.manager.find(Bid, {
        where: {
          bidderId,
          isWinningBid: true,
          status: BidStatus.ACTIVE,
        },
      });
      const leadingAuctionIds = activeLeadingBids
        .map((b) => b.auctionId)
        .filter((id) => id !== auctionId);
      const activeLeadingAuctions = leadingAuctionIds.length
        ? await queryRunner.manager.find(Auction, {
            where: {
              id: In(leadingAuctionIds),
              status: In([AuctionStatus.ACTIVE, AuctionStatus.PUBLISHED]),
            },
          })
        : [];
      const activeLeadingTotal = activeLeadingAuctions.reduce(
        (sum, a) => sum + Number(a.currentPrice),
        0,
      );

      const newBidAmount = dto.maxAmount !== undefined && dto.maxAmount !== null 
        ? Number(dto.maxAmount) 
        : Number(dto.amount);

      const totalRisk = wonUnpaidTotal + activeLeadingTotal + newBidAmount;
      const biddingLimit = Number(bidder.biddingLimit ?? 50000);
      
      if (totalRisk > biddingLimit) {
        // Limit = depozit × 5 (depozit, hedef limitin %20'si). 50K taban limit
        // depozitosuzdur; hedef riskin tamamı depozitle teminatlandırılır.
        const requiredDeposit = totalRisk * 0.20 - Number(bidder.totalDeposit ?? 0);
        throw new ForbiddenException({
          code: 'BIDDING_LIMIT_EXCEEDED',
          message: 'Müzayede limitiniz yetersizdir. Limiti yükseltmek için depozito ödemesi yapın.',
          currentLimit: biddingLimit,
          requiredLimit: totalRisk,
          requiredDeposit: Math.max(0, requiredDeposit),
        });
      }

      // Check if user is registered and approved for this auction or the event it belongs to
      const registration = await this.registrationRepo.findOne({
        where: [
          { userId: bidderId, auctionId: auction.id },
          ...(auction.eventId ? [{ userId: bidderId, eventId: auction.eventId }] : []),
        ],
      });

      if (!registration || registration.status !== AuctionRegistrationStatus.APPROVED) {
        throw this.forbidden(
          RC.AUCTION_REGISTRATION_REQUIRED,
          registration?.status === AuctionRegistrationStatus.PENDING
            ? 'Müzayede katılım onayınız bekleniyor'
            : 'Müzayedeye katılabilmek için şartnameyi kabul edip kayıt olmalısınız',
        );
      }

      // 2. Status check
      if (
        auction.status !== AuctionStatus.ACTIVE &&
        auction.status !== AuctionStatus.PUBLISHED
      ) {
        throw this.badRequest(RC.AUCTION_NOT_ACTIVE, 'Müzayede aktif değil');
      }

      // 3. Time check (D-16: endTime sonrası kesin red)
      const now = new Date();
      if (now > auction.endTime) {
        throw this.badRequest(RC.AUCTION_ENDED, 'Müzayede sona erdi');
      }

      // AUCT-ABS: PUBLISHED + startTime öncesi teklifler absentee (ön teklif)
      // olarak kaydedilir — hold açılmaz, fiyat değişmez. Müzayede başlarken
      // resolveAbsenteeBids proxy mantığıyla yarıştırır; finalizeAuction
      // sadece ACTIVE işlediğinden askıda hold kalmaz.
      const isAbsenteeWindow =
        auction.status === AuctionStatus.PUBLISHED &&
        now < new Date(auction.startTime);

      // AUCT-18: Kültür varlığı kısıtlı müzayede — T.C. vatandaşı kontrolü
      if (auction.culturalAssetRestricted) {
        if (!bidder.nationality || bidder.nationality !== 'TR') {
          throw this.badRequest(
            RC.VALIDATION_ERROR,
            'Kültür varlığı müzayedelerine sadece T.C. vatandaşları teklif verebilir',
          );
        }
      }

      // 4. Self-bid check
      if (bidderId === auction.sellerId) {
        throw this.badRequest(
          RC.CANNOT_BID_OWN,
          'Kendi müzayedenize teklif veremezsiniz',
        );
      }

      // 5. Min increment check (AUCT-12)
      const currentPrice = Number(auction.currentPrice);
      const minIncrement = Number(auction.minIncrement);
      const minBid = currentPrice + minIncrement;
      if (dto.amount < minBid) {
        throw this.badRequest(
          RC.BID_TOO_LOW,
          `Minimum teklif: ${minBid.toFixed(2)}₺`,
        );
      }

      const diffCents = Math.round((dto.amount - currentPrice) * 100);
      const incrementCents = Math.round(minIncrement * 100);
      if (diffCents % incrementCents !== 0) {
        throw this.badRequest(
          RC.VALIDATION_ERROR,
          `Teklif artış miktarının (${minIncrement}) tam katı olmalıdır`,
        );
      }

      if (dto.maxAmount !== undefined && dto.maxAmount < dto.amount) {
        throw this.badRequest(
          RC.VALIDATION_ERROR,
          'Maximum teklif teklif tutarindan düşük olamaz',
        );
      }

      const submittedMaxAmount = Number(dto.maxAmount ?? dto.amount);

      // 6b. Absentee penceresi: teklif ABSENTEE olarak saklanır ve döngü biter.
      // Bidder başına tek aktif ön teklif — eskisi audit için CANCELLED yapılır.
      if (isAbsenteeWindow) {
        await queryRunner.manager.update(
          Bid,
          { auctionId, bidderId, status: BidStatus.ABSENTEE },
          { status: BidStatus.CANCELLED },
        );

        const absenteeBid = queryRunner.manager.create(Bid, {
          auctionId,
          bidderId,
          amount: dto.amount,
          maxAmount: submittedMaxAmount,
          status: BidStatus.ABSENTEE,
          isWinningBid: false,
        });
        await queryRunner.manager.save(absenteeBid);
        await queryRunner.commitTransaction();

        return {
          code: RC.BID_ACCEPTED,
          message: 'Absentee bid recorded',
          bid: {
            id: absenteeBid.id,
            amount: Number(absenteeBid.amount),
            maxAmount: submittedMaxAmount,
            premiumAmount: 0,
            buyerPremiumAmount: 0,
            estimatedTotal: Number(absenteeBid.amount),
            createdAt: absenteeBid.createdAt,
            isLeadingBid: false,
            outbidImmediately: false,
            absentee: true,
          },
          auction: {
            currentPrice: Number(auction.currentPrice),
            bidCount: auction.bidCount,
            endTime: auction.endTime,
            serverTime: new Date().toISOString(),
            leadingBidderId: null,
            reserveMet: auction.reserveMet,
          },
        };
      }

      // 7. Find previous leading bid (for outbid notification)
      const previousLeadBid = await queryRunner.manager.findOne(Bid, {
        where: { auctionId, isWinningBid: true },
      });

      const previousLeadMaxAmount = this.getBidMaxAmount(previousLeadBid);
      const reserveMetForLeadingBid = this.isReserveMet(
        auction.reservePrice,
        submittedMaxAmount,
      );

      // 8. Challenger loses immediately to existing proxy ceiling.
      if (
        previousLeadBid &&
        previousLeadBid.bidderId !== bidderId &&
        submittedMaxAmount <= previousLeadMaxAmount
      ) {
        const effectiveCurrentPrice = this.calculateVisibleWinningAmount({
          leadingMaxAmount: previousLeadMaxAmount,
          challengerMaxAmount: submittedMaxAmount,
          requestedAmount: dto.amount,
          minimumBid: minBid,
          minIncrement,
        });

        previousLeadBid.amount = effectiveCurrentPrice;
        previousLeadBid.isWinningBid = true;
        previousLeadBid.status = BidStatus.ACTIVE;
        await queryRunner.manager.save(previousLeadBid);

        const losingBid = queryRunner.manager.create(Bid, {
          auctionId,
          bidderId,
          amount: submittedMaxAmount,
          maxAmount: submittedMaxAmount,
          status: BidStatus.OUTBID,
          isWinningBid: false,
        });
        await queryRunner.manager.save(losingBid);

        auction.currentPrice = effectiveCurrentPrice;
        auction.bidCount = (auction.bidCount || 0) + 1;
        auction.reserveMet = this.isReserveMet(
          auction.reservePrice,
          previousLeadMaxAmount,
        );

        const antiSnipingResult = this.checkAntiSniping(auction, now);
        if (antiSnipingResult.extended) {
          auction.endTime = antiSnipingResult.newEndTime!;
          auction.currentExtensions = antiSnipingResult.extensionNumber!;
        }

        await queryRunner.manager.save(auction);
        await queryRunner.commitTransaction();

        const bidderName = await this.getBidderName(previousLeadBid.bidderId);
        this.auctionGateway.emitBidNew(auctionId, {
          amount: Number(previousLeadBid.amount),
          bidderName,
          currentPrice: Number(auction.currentPrice),
          bidCount: auction.bidCount,
          endTime: auction.endTime.toISOString(),
          serverTime: new Date().toISOString(),
        }, auction.eventId);
        this.auctionGateway.emitBidOutbid(auctionId, bidderId, {
          newAmount: Number(previousLeadBid.amount),
          yourBid: submittedMaxAmount,
        }, auction.eventId);

        if (antiSnipingResult.extended) {
          this.auctionGateway.emitAuctionExtended(auctionId, {
            newEndTime: antiSnipingResult.newEndTime!.toISOString(),
            extensionNumber: antiSnipingResult.extensionNumber!,
          }, auction.eventId);

          const currentExt = antiSnipingResult.extensionNumber!;
          const jobIdsToRemove = [`end-${auctionId}`];
          for (let i = 1; i < currentExt; i++) {
            jobIdsToRemove.push(`end-${auctionId}-ext${i}`);
          }
          for (const jobId of jobIdsToRemove) {
            await this.removeQueueJob(jobId);
          }

          const delay = Math.max(
            0,
            antiSnipingResult.newEndTime!.getTime() - Date.now(),
          );
          try {
            await this.auctionQueue.add(
              'end-auction',
              { auctionId },
              {
                delay,
                jobId: `end-${auctionId}-ext${currentExt}`,
              },
            );
          } catch (queueError) {
            // Teklif kabul edildi, endTime DB'de uzadı; görev kurulamazsa
            // bitiş açılış reconcile'ında yeniden planlanır. Teklifi bozma.
            this.logger.error(
              `Anti-sniping bitiş görevi kurulamadı (${auctionId}): ${queueError}`,
            );
          }
        }

        return {
          code: RC.BID_ACCEPTED,
          message: 'Bid accepted',
          bid: {
            id: losingBid.id,
            amount: Number(losingBid.amount),
            maxAmount: submittedMaxAmount,
            premiumAmount: 0,
            buyerPremiumAmount: 0,
            estimatedTotal:
              Number(losingBid.amount),
            createdAt: losingBid.createdAt,
            isLeadingBid: false,
            outbidImmediately: true,
          },
          auction: {
            currentPrice: Number(auction.currentPrice),
            bidCount: auction.bidCount,
            endTime: auction.endTime,
            serverTime: new Date().toISOString(),
            leadingBidderId: previousLeadBid.bidderId,
            reserveMet: auction.reserveMet,
          },
          antiSniping: antiSnipingResult,
          previousLeadBidderId: previousLeadBid.bidderId,
        };
      }

      const effectiveCurrentPrice =
        previousLeadBid && previousLeadBid.bidderId !== bidderId
          ? this.calculateVisibleWinningAmount({
              leadingMaxAmount: submittedMaxAmount,
              challengerMaxAmount: previousLeadMaxAmount,
              requestedAmount: dto.amount,
              minimumBid: minBid,
              minIncrement,
            })
          : dto.amount;

      // 9-10. Pey verirken para hareketi/bloke yapılmaz — risk yönetimi
      // yukarıdaki biddingLimit kontrolüyle sağlanır (depozit modeli).

      // 11. Mark previous lead bid as OUTBID (BIZ-12)
      if (previousLeadBid) {
        previousLeadBid.isWinningBid = false;
        previousLeadBid.status = BidStatus.OUTBID;
        await queryRunner.manager.save(previousLeadBid);
      }

      // 12. Save new bid
      const bid = queryRunner.manager.create(Bid, {
        auctionId,
        bidderId,
        amount: effectiveCurrentPrice,
        maxAmount: submittedMaxAmount,
        status: BidStatus.ACTIVE,
        isWinningBid: true,
      });
      await queryRunner.manager.save(bid);

      // 13. Update auction
      auction.currentPrice = effectiveCurrentPrice;
      auction.bidCount = (auction.bidCount || 0) + 1;
      auction.reserveMet = reserveMetForLeadingBid;

      // 14. Anti-sniping check (D-03, D-10)
      const antiSnipingResult = this.checkAntiSniping(auction, now);
      if (antiSnipingResult.extended) {
        auction.endTime = antiSnipingResult.newEndTime!;
        auction.currentExtensions = antiSnipingResult.extensionNumber!;
      }

      await queryRunner.manager.save(auction);

      // ─── COMMIT ───────────────────────────────────────────
      await queryRunner.commitTransaction();

      // ═══ Post-commit: Gateway events (Plan 05-04) ═════════
      // Events MUST be emitted after commit — not inside transaction

      // Broadcast new bid to room
      const bidderName = await this.getBidderName(bidderId);
      this.auctionGateway.emitBidNew(auctionId, {
        amount: Number(bid.amount),
        bidderName,
        currentPrice: Number(auction.currentPrice),
        bidCount: auction.bidCount,
        endTime: auction.endTime.toISOString(),
        serverTime: new Date().toISOString(),
      }, auction.eventId);

      // Notify previous leader they got outbid
      if (previousLeadBid && previousLeadBid.bidderId !== bidderId) {
        this.auctionGateway.emitBidOutbid(auctionId, previousLeadBid.bidderId, {
          newAmount: Number(bid.amount),
          yourBid: Number(previousLeadBid.amount),
        }, auction.eventId);
        await this.notificationService?.createFromEvent({
          eventId: `auction-outbid:${auctionId}:${previousLeadBid.bidderId}:${bid.id}`,
          userId: previousLeadBid.bidderId,
          eventType: NotificationEventType.AUCTION_OUTBID,
          title: 'Outbid',
          body: 'A higher bid was placed.',
          relatedEntityType: 'auction',
          relatedEntityId: auctionId,
        });
      }

      // If anti-sniping extended, notify room + reschedule BullMQ
      if (antiSnipingResult.extended) {
        this.auctionGateway.emitAuctionExtended(auctionId, {
          newEndTime: antiSnipingResult.newEndTime!.toISOString(),
          extensionNumber: antiSnipingResult.extensionNumber!,
        }, auction.eventId);

        // Reschedule BullMQ end-auction job
        // FIX: Önceki TÜM end job'larını temizle (base + tüm extension'lar)
        const currentExt = antiSnipingResult.extensionNumber!;
        const jobIdsToRemove = [`end-${auctionId}`];
        for (let i = 1; i < currentExt; i++) {
          jobIdsToRemove.push(`end-${auctionId}-ext${i}`);
        }
        for (const jobId of jobIdsToRemove) {
          await this.removeQueueJob(jobId);
        }

        const delay = Math.max(
          0,
          antiSnipingResult.newEndTime!.getTime() - Date.now(),
        );
        try {
          await this.auctionQueue.add(
            'end-auction',
            { auctionId },
            {
              delay,
              jobId: `end-${auctionId}-ext${currentExt}`,
            },
          );
        } catch (queueError) {
          // Teklif kabul edildi, endTime DB'de uzadı; görev kurulamazsa
          // bitiş açılış reconcile'ında yeniden planlanır. Teklifi bozma.
          this.logger.error(
            `Anti-sniping bitiş görevi kurulamadı (${auctionId}): ${queueError}`,
          );
        }
      }

      return {
        code: RC.BID_ACCEPTED,
        message: 'Bid accepted',
          bid: {
            id: bid.id,
            amount: Number(bid.amount),
            maxAmount: submittedMaxAmount,
            premiumAmount: 0,
            buyerPremiumAmount: 0,
            estimatedTotal: Number(bid.amount),
            createdAt: bid.createdAt,
            isLeadingBid: true,
            outbidImmediately: false,
        },
        auction: {
          currentPrice: Number(auction.currentPrice),
          bidCount: auction.bidCount,
          endTime: auction.endTime,
          serverTime: new Date().toISOString(),
          leadingBidderId: bidderId,
          reserveMet: auction.reserveMet,
        },
        antiSniping: antiSnipingResult,
        previousLeadBidderId: previousLeadBid?.bidderId || null,
      };
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async withdrawBid(auctionId: string, bidderId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!auction) {
        throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
      }

      // AUCT-ABS: başlamamış müzayedede ön teklif serbestçe geri çekilir
      // (hold ve fiyat etkisi yok).
      if (
        auction.status === AuctionStatus.PUBLISHED &&
        new Date() < new Date(auction.startTime)
      ) {
        const absenteeBid = await queryRunner.manager.findOne(Bid, {
          where: { auctionId, bidderId, status: BidStatus.ABSENTEE },
          lock: { mode: 'pessimistic_write' },
        });
        if (!absenteeBid) {
          throw this.badRequest(
            RC.BID_WITHDRAWAL_NOT_ALLOWED,
            'Geri cekilebilecek on teklif bulunamadi',
          );
        }
        absenteeBid.status = BidStatus.CANCELLED;
        await queryRunner.manager.save(absenteeBid);
        await queryRunner.commitTransaction();
        return {
          code: RC.BID_WITHDRAWN,
          message: 'On teklif geri cekildi',
          auctionId,
          bidId: absenteeBid.id,
        };
      }

      if (auction.status !== AuctionStatus.ACTIVE) {
        throw this.badRequest(
          RC.BID_WITHDRAWAL_NOT_ALLOWED,
          'Sadece aktif muzayedelerde teklif geri cekilebilir',
        );
      }

      if (new Date() > auction.endTime) {
        throw this.badRequest(RC.AUCTION_ENDED, 'Müzayede sona erdi');
      }

      const activeBid = await queryRunner.manager.findOne(Bid, {
        where: {
          auctionId,
          bidderId,
          isWinningBid: true,
          status: BidStatus.ACTIVE,
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!activeBid) {
        throw this.badRequest(
          RC.BID_WITHDRAWAL_NOT_ALLOWED,
          'Geri cekilebilecek aktif lider teklif bulunamadi',
        );
      }

      const previousCompetingBid = await queryRunner.manager.findOne(Bid, {
        where: {
          auctionId,
          id: Not(activeBid.id),
          status: Not(BidStatus.CANCELLED),
        },
        order: {
          amount: 'DESC',
          createdAt: 'DESC',
        },
      });

      if (previousCompetingBid) {
        throw this.badRequest(
          RC.BID_WITHDRAWAL_NOT_ALLOWED,
          'Rekabete girmis lider teklif geri cekilemez',
        );
      }

      activeBid.status = BidStatus.CANCELLED;
      activeBid.isWinningBid = false;
      await queryRunner.manager.save(activeBid);

      auction.currentPrice = Number(auction.startPrice);
      auction.bidCount = Math.max(0, (auction.bidCount || 0) - 1);
      auction.reserveMet = false;
      await queryRunner.manager.save(auction);

      await queryRunner.commitTransaction();

      this.auctionGateway.emitBidWithdrawn(
        auctionId,
        {
          currentPrice: Number(auction.currentPrice),
          bidCount: auction.bidCount,
          reserveMet: auction.reserveMet,
          endTime: auction.endTime.toISOString(),
        },
        auction.eventId,
      );

      return {
        code: RC.BID_WITHDRAWN,
        message: 'Teklif geri cekildi',
        auctionId,
        bidId: activeBid.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ Anti-Sniping Logic (D-03, D-10) ══════════════════════
  // ═══════════════════════════════════════════════════════════

  private checkAntiSniping(
    auction: Auction,
    bidTime: Date,
  ): {
    extended: boolean;
    newEndTime?: Date;
    extensionNumber?: number;
    extensionSeconds?: number;
  } {
    // Anti-sniping disabled
    if (!auction.antiSnipingEnabled) {
      return { extended: false };
    }

    // Max extensions reached
    if (auction.currentExtensions >= auction.maxExtensions) {
      return { extended: false };
    }

    const endTime = new Date(auction.endTime);
    const timeLeft = endTime.getTime() - bidTime.getTime();

    // Timed auction has different rules (AUCT-T-03)
    if (auction.auctionType === AuctionType.TIMED) {
      return this.checkTimedAntiSniping(auction, bidTime);
    }

    // ─── Realtime: Dinamik veya varsayılan sabit süre ────
    const extensionSec = auction.extensionDuration || 60;

    // Check if bid is within the anti-sniping window
    const windowMs = auction.extensionSeconds * 1000;
    if (timeLeft <= windowMs) {
      const newEndTime = new Date(endTime.getTime() + extensionSec * 1000);
      this.logger.log(
        `Anti-sniping triggered for auction ${auction.id}: extension ${auction.currentExtensions + 1} (+${extensionSec}s)`,
      );
      return {
        extended: true,
        newEndTime,
        extensionNumber: auction.currentExtensions + 1,
        extensionSeconds: extensionSec,
      };
    }

    return { extended: false };
  }

  // ─── Timed Auction Anti-Sniping (D-13, AUCT-T-03) ────────

  private checkTimedAntiSniping(
    auction: Auction,
    bidTime: Date,
  ): {
    extended: boolean;
    newEndTime?: Date;
    extensionNumber?: number;
    extensionSeconds?: number;
  } {
    // AUCT-T-03: Son saniyelerde gelen her teklif -> uzatma süresi ekle
    const maxExtensions = auction.maxExtensions ?? 3;
    const windowSec = auction.extensionSeconds ?? 60;
    const extensionSec = auction.extensionDuration ?? 120; // default 2 dakika

    if (auction.currentExtensions >= maxExtensions) {
      return { extended: false };
    }

    const endTime = new Date(auction.endTime);
    const timeLeft = endTime.getTime() - bidTime.getTime();

    if (timeLeft <= windowSec * 1000) {
      const newEndTime = new Date(
        endTime.getTime() + extensionSec * 1000,
      );
      this.logger.log(
        `Timed anti-sniping triggered for auction ${auction.id}: extension ${auction.currentExtensions + 1} (+${extensionSec}s)`,
      );
      return {
        extended: true,
        newEndTime,
        extensionNumber: auction.currentExtensions + 1,
        extensionSeconds: extensionSec,
      };
    }

    return { extended: false };
  }

  // ═══════════════════════════════════════════════════════════
  // ═══ Finalization (Plan 05-04: BIZ-12 bid lifecycle) ══════
  // ═══════════════════════════════════════════════════════════

  async finalizeAuction(auctionId: string, force = false) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let transactionCommitted = false;

    try {
      // WR-04: Lock auction row to prevent race with last-second bids
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!auction || auction.status !== AuctionStatus.ACTIVE) {
        await queryRunner.commitTransaction();
        transactionCommitted = true;
        return;
      }

      // FIX: Orphan job guard — endTime henüz geçmediyse bu eski bir extension job'dur
      if (auction.endTime > new Date()) {
        this.logger.warn(
          `Orphan end-auction job for ${auctionId}, endTime not reached yet. Skipping.`,
        );
        await queryRunner.commitTransaction();
        return;
      }

      // D-11: No bids → FAILED
      if (auction.bidCount === 0) {
        auction.status = AuctionStatus.FAILED;
        auction.winnerId = null;
        auction.winnerPaymentStatus = AuctionPaymentStatus.NONE;
        auction.winnerPaymentDeadlineAt = null;
        auction.winnerPaymentCompletedAt = null;
        auction.winningBidId = null;
        auction.orderId = null;
        auction.fallbackRound = 0;
        auction.paymentAttemptCount = 0;
        await queryRunner.manager.save(auction);
        await queryRunner.commitTransaction();
        transactionCommitted = true;

        await this.handleSequentialLotProgression(auction, force);

        this.auctionGateway.emitAuctionEnded(auctionId, {
          finalPrice: Number(auction.startPrice),
          winnerId: null,
          bidCount: 0,
        });
        // WR-03: Clean up viewer count
        this.auctionGateway.clearViewerCount(auctionId);
        return auction;
      }

      if (
        auction.reservePrice !== null &&
        auction.reservePrice !== undefined &&
        !auction.reserveMet
      ) {
        auction.status = AuctionStatus.FAILED;
        auction.winnerId = null;
        auction.winnerPaymentStatus = AuctionPaymentStatus.NONE;
        auction.winnerPaymentDeadlineAt = null;
        auction.winnerPaymentCompletedAt = null;
        auction.winningBidId = null;
        auction.orderId = null;
        auction.fallbackRound = 0;
        auction.paymentAttemptCount = 0;
        await queryRunner.manager.save(auction);
        await queryRunner.commitTransaction();
        transactionCommitted = true;

        await this.handleSequentialLotProgression(auction, force);
        this.auctionGateway.emitAuctionEnded(auctionId, {
          finalPrice: Number(auction.currentPrice),
          winnerId: null,
          bidCount: auction.bidCount,
        });
        this.auctionGateway.clearViewerCount(auctionId);
        return auction;
      }

      auction.status = AuctionStatus.ENDED;

      // Only the active leader can win. Cancelled, expired, or historical
      // outbid rows stay in the audit trail but must never be promoted.
      const winningBid = await queryRunner.manager.findOne(Bid, {
        where: {
          auctionId,
          status: BidStatus.ACTIVE,
          isWinningBid: true,
        },
        order: { amount: 'DESC' },
      });

      if (!winningBid) {
        auction.status = AuctionStatus.FAILED;
        auction.winnerId = null;
        auction.winnerPaymentStatus = AuctionPaymentStatus.NONE;
        auction.winnerPaymentDeadlineAt = null;
        auction.winnerPaymentCompletedAt = null;
        auction.winningBidId = null;
        auction.orderId = null;
        auction.fallbackRound = 0;
        auction.paymentAttemptCount = 0;
        await queryRunner.manager.save(auction);
        await queryRunner.commitTransaction();
        transactionCommitted = true;

        this.auctionGateway.emitAuctionEnded(auctionId, {
          finalPrice: Number(auction.currentPrice),
          winnerId: null,
          bidCount: auction.bidCount,
        });
        this.auctionGateway.clearViewerCount(auctionId);
        return auction;
      }

      auction.winnerId = winningBid.bidderId;
      auction.winningBidId = winningBid.id;
      auction.winnerPaymentStatus = AuctionPaymentStatus.PENDING;
      // Ödeme penceresi satış onayı (approveSale) ile açılır — deadline o anda kurulur.
      auction.winnerPaymentDeadlineAt = null;
      auction.saleApprovedAt = null;
      auction.saleApprovedBy = null;
      auction.winnerPaymentCompletedAt = null;
      auction.orderId = null;
      auction.fallbackRound = 0;
      auction.paymentAttemptCount = 0;

      // BIZ-12: Mark winning bid as WON
      winningBid.status = BidStatus.WON;
      winningBid.isWinningBid = true;
      await queryRunner.manager.save(winningBid);

      // BIZ-12: Keep cancelled/expired rows immutable while closing live bids.
      await queryRunner.manager
        .createQueryBuilder()
        .update(Bid)
        .set({ status: BidStatus.OUTBID, isWinningBid: false })
        .where(
          'auctionId = :auctionId AND id != :winnerId AND status IN (:...statuses)',
          {
            auctionId,
            winnerId: winningBid.id,
            statuses: [BidStatus.ACTIVE, BidStatus.OUTBID],
          },
        )
        .execute();

      await queryRunner.manager.save(auction);
      await queryRunner.commitTransaction();
      transactionCommitted = true;

      // ─── Post-commit: Gateway events + wallet operations ───
      await this.runFinalizationSideEffects(auction, winningBid);
      await this.handleSequentialLotProgression(auction, force);

      // WR-03: Clean up viewer count for ended auction
      this.auctionGateway.clearViewerCount(auctionId);
      return auction;
    } catch (error) {
      if (!transactionCommitted) {
        await queryRunner.rollbackTransaction();
      } else {
        try {
          await this.scheduleFinalizationCompensation(auctionId, error);
        } catch (compensationError) {
          // Kompanzasyon kurulumu patlarsa asıl hatayı gölgelemesin.
          this.logger.error(
            `Finalization kompanzasyon görevi kurulamadı (${auctionId}): ${compensationError}`,
          );
        }
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async scheduleFinalizationCompensation(
    auctionId: string,
    error: unknown,
  ): Promise<void> {
    const message =
      error instanceof Error ? error.message : 'Unknown finalization error';
    this.logger.error(
      `Auction finalization side effect failed for ${auctionId}: ${message}`,
      error instanceof Error ? error.stack : undefined,
    );
    await this.auctionQueue.add(
      'auction-finalization-compensation',
      { auctionId, errorMessage: message },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 10000 },
        jobId: `auction-finalization-compensation-${auctionId}`,
      },
    );
  }

  async retryFinalizationSideEffects(auctionId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (
      !auction ||
      auction.status !== AuctionStatus.ENDED ||
      !auction.winnerId ||
      auction.winnerPaymentStatus !== AuctionPaymentStatus.PENDING
    ) {
      return {
        code: RC.AUCTION_FINALIZATION_SKIPPED,
        message: 'Auction finalization retry skipped',
      };
    }

    const winningBid = await this.bidRepo.findOne({
      where: {
        auctionId,
        bidderId: auction.winnerId,
        status: BidStatus.WON,
      },
      order: { amount: 'DESC' },
    });

    if (!winningBid) {
      return {
        code: RC.AUCTION_FINALIZATION_SKIPPED,
        message: 'Winning bid not found',
      };
    }

    await this.runFinalizationSideEffects(auction, winningBid);
    return {
      code: RC.AUCTION_FINALIZATION_RETRIED,
      message: 'Auction finalization side effects retried',
    };
  }

  private async runFinalizationSideEffects(
    auction: Auction,
    winningBid: Bid,
  ): Promise<void> {
    const auctionId = auction.id;

    this.auctionGateway.emitAuctionEnded(auctionId, {
      finalPrice: Number(auction.currentPrice),
      winnerId: auction.winnerId,
      bidCount: auction.bidCount,
    });

    this.auctionGateway.emitBidWinner(auctionId, winningBid.bidderId, {
      finalPrice: Number(winningBid.amount),
      premiumAmount: 0,
    });
    this.auctionGateway.emitBidLost(
      auctionId,
      winningBid.bidderId,
      {
        finalPrice: Number(winningBid.amount),
        holdReleased: false,
      },
      auction.eventId,
    );
    // Ödeme, satış onayı (approveSale) sonrasında açılır; kazanan şimdilik
    // sadece bilgilendirilir.
    await this.notificationService?.createFromEvent({
      eventId: `auction-won:${auctionId}:${winningBid.bidderId}`,
      userId: winningBid.bidderId,
      eventType: NotificationEventType.AUCTION_WON,
      title: 'Müzayedeyi kazandınız',
      body: 'Satış, müzayede kontrolleri tamamlandıktan sonra onaylanacak ve ödeme sepetinize düşecek.',
      relatedEntityType: 'auction',
      relatedEntityId: auctionId,
    });
  }

  // ─── Satış Onayı: admin/organizatör onayı → ödeme penceresi açılır ───
  async approveSale(auctionId: string, adminId?: string) {
    const auction = await this.auctionRepo.findOne({ where: { id: auctionId } });
    if (!auction) {
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    }
    if (
      auction.status !== AuctionStatus.ENDED ||
      !auction.winnerId ||
      !auction.winningBidId ||
      auction.winnerPaymentStatus !== AuctionPaymentStatus.PENDING
    ) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Sadece kazananı belli olmuş ve ödemesi bekleyen müzayedeler için satış onayı verilebilir',
      );
    }
    if (auction.saleApprovedAt) {
      return {
        code: RC.SUCCESS,
        message: 'Satış zaten onaylanmış',
        auctionId,
        saleApprovedAt: auction.saleApprovedAt,
      };
    }

    const winningBid = await this.bidRepo.findOne({
      where: { id: auction.winningBidId, auctionId },
    });
    if (!winningBid) {
      throw this.notFound(RC.NOT_FOUND, 'Kazanan teklif bulunamadı');
    }

    auction.saleApprovedAt = new Date();
    auction.saleApprovedBy = adminId ?? null;
    auction.winnerPaymentDeadlineAt = this.buildWinnerPaymentDeadline();
    await this.auctionRepo.save(auction);

    // Kazanılan ürün ödeme için sepete düşer.
    try {
      await this.cartItemRepo.delete({
        userId: winningBid.bidderId,
        productId: auction.productId,
      });
      const cartItem = this.cartItemRepo.create({
        userId: winningBid.bidderId,
        productId: auction.productId,
        auctionId: auction.id,
        customPrice: Number(winningBid.amount),
        quantity: 1,
      });
      await this.cartItemRepo.save(cartItem);
    } catch (cartError) {
      this.logger.error(
        `Failed to add won auction ${auction.id} to cart for user ${winningBid.bidderId}: ${cartError}`,
      );
    }

    await this.scheduleWinnerPaymentJobs(
      auctionId,
      auction.winnerPaymentDeadlineAt,
      auction.fallbackRound,
    );

    await this.notificationService?.createFromEvent({
      eventId: `auction-payment-window:${auctionId}:${winningBid.bidderId}:${auction.fallbackRound}`,
      userId: winningBid.bidderId,
      eventType: NotificationEventType.PAYMENT_REMINDER,
      title: 'Ödeme açıldı',
      body: 'Kazandığınız ürün sepetinize eklendi. Ödemenizi kartınızla tamamlayabilirsiniz.',
      relatedEntityType: 'auction',
      relatedEntityId: auctionId,
    });

    return {
      code: RC.SUCCESS,
      message: 'Satış onaylandı, kazanana ödeme penceresi açıldı',
      auctionId,
      saleApprovedAt: auction.saleApprovedAt,
      winnerPaymentDeadlineAt: auction.winnerPaymentDeadlineAt,
    };
  }

  // Etkinlikteki tüm biten lotların satışını topluca onayla.
  async approveEventSales(eventId: string, adminId?: string) {
    const endedLots = await this.auctionRepo.find({
      where: {
        eventId,
        status: AuctionStatus.ENDED,
        winnerPaymentStatus: AuctionPaymentStatus.PENDING,
      },
    });

    const results: { auctionId: string; approved: boolean; error?: string }[] = [];
    for (const lot of endedLots) {
      try {
        await this.approveSale(lot.id, adminId);
        results.push({ auctionId: lot.id, approved: true });
      } catch (err) {
        results.push({
          auctionId: lot.id,
          approved: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return {
      code: RC.SUCCESS,
      message: `${results.filter((r) => r.approved).length}/${results.length} lot satışı onaylandı`,
      results,
    };
  }

  async completeWinnerPayment(auctionId: string, userId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!auction) {
        throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
      }
      if (!this.isWinnerPaymentPending(auction)) {
        return {
          code: RC.AUCTION_WINNER_PAYMENT_SKIPPED,
          message: 'Winner payment is not pending',
          auctionId,
        };
      }
      if (auction.winnerId !== userId) {
        throw this.forbidden(
          RC.FORBIDDEN,
          'Sadece mevcut kazanan odemeyi tamamlayabilir',
        );
      }
      if (!auction.saleApprovedAt) {
        throw this.badRequest(
          RC.VALIDATION_ERROR,
          'Satış henüz onaylanmadı. Onay sonrası ödeme sepetinize açılacak.',
        );
      }
      if (
        auction.winnerPaymentDeadlineAt &&
        auction.winnerPaymentDeadlineAt.getTime() <= Date.now()
      ) {
        throw this.badRequest(RC.AUCTION_ENDED, 'Odeme suresi doldu');
      }

      const winningBid = await queryRunner.manager.findOne(Bid, {
        where: { id: auction.winningBidId!, auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!winningBid) {
        throw this.notFound(RC.NOT_FOUND, 'Kazanan teklif bulunamadı');
      }

      // Ödeme kredi kartıyla sepet üzerinden (Iyzico) yapılır — cüzdan/bloke
      // kullanılmaz. Burada sadece sepette ödeme kalemi garanti edilir.
      const existingCartItem = await queryRunner.manager.findOne(CartItem, {
        where: { userId, auctionId },
      });
      if (!existingCartItem) {
        await queryRunner.manager.delete(CartItem, {
          userId,
          productId: auction.productId,
        });
        const cartItem = queryRunner.manager.create(CartItem, {
          userId,
          productId: auction.productId,
          auctionId: auction.id,
          customPrice: Number(winningBid.amount),
          quantity: 1,
        });
        await queryRunner.manager.save(cartItem);
      }

      await queryRunner.commitTransaction();

      return {
        code: RC.SUCCESS,
        message:
          'Kazandığınız ürün sepetinizde. Ödemeyi sepetten kredi kartınızla tamamlayın.',
        auctionId,
        paymentVia: 'cart',
        amount: Number(winningBid.amount),
        paymentStatus: auction.winnerPaymentStatus,
        winnerPaymentDeadlineAt: auction.winnerPaymentDeadlineAt,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async sendWinnerPaymentReminder(auctionId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!this.isWinnerPaymentPending(auction) || !auction?.winnerId) {
      return {
        code: RC.AUCTION_WINNER_PAYMENT_SKIPPED,
        message: 'Winner payment reminder skipped',
      };
    }

    await this.notificationService?.createFromEvent({
      eventId: `auction-payment-reminder:${auctionId}:${auction.winnerId}:${auction.fallbackRound}`,
      userId: auction.winnerId,
      eventType: NotificationEventType.PAYMENT_REMINDER,
      title: 'Payment reminder',
      body: 'Your auction payment window is about to expire.',
      relatedEntityType: 'auction',
      relatedEntityId: auctionId,
    });

    return {
      code: RC.AUCTION_WINNER_PAYMENT_SKIPPED,
      message: 'Winner payment reminder sent',
    };
  }

  async processWinnerPaymentExpiry(auctionId: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!this.isWinnerPaymentPending(auction) || !auction?.winnerId) {
        await queryRunner.commitTransaction();
        return {
          code: RC.AUCTION_WINNER_PAYMENT_SKIPPED,
          message: 'Winner payment expiry skipped',
        };
      }

      if (
        auction.winnerPaymentDeadlineAt &&
        auction.winnerPaymentDeadlineAt.getTime() > Date.now()
      ) {
        await queryRunner.commitTransaction();
        return {
          code: RC.AUCTION_WINNER_PAYMENT_SKIPPED,
          message: 'Winner payment expiry skipped',
        };
      }

      const expiredWinnerId = auction.winnerId;
      const winningBid = await queryRunner.manager.findOne(Bid, {
        where: { id: auction.winningBidId!, auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (winningBid) {
        winningBid.status = BidStatus.EXPIRED;
        winningBid.isWinningBid = false;
        await queryRunner.manager.save(winningBid);
      }

      const fallbackBid =
        (auction.fallbackRound || 0) < MAX_FALLBACK_ROUNDS
          ? await this.selectFallbackBid(queryRunner.manager, auction, [
              expiredWinnerId,
            ])
          : (() => {
              auction.status = AuctionStatus.FAILED;
              auction.winnerId = null;
              auction.winningBidId = null;
              auction.winnerPaymentStatus = AuctionPaymentStatus.EXPIRED;
              auction.winnerPaymentDeadlineAt = null;
              auction.winnerPaymentCompletedAt = null;
              auction.orderId = null;
              return null;
            })();

      await queryRunner.manager.save(auction);
      await queryRunner.commitTransaction();

      if (fallbackBid && auction.winnerId) {
        await this.scheduleWinnerPaymentJobs(
          auction.id,
          auction.winnerPaymentDeadlineAt,
          auction.fallbackRound,
        );
        await this.notificationService?.createFromEvent({
          eventId: `auction-fallback-payment:${auction.id}:${auction.winnerId}:${auction.fallbackRound}`,
          userId: auction.winnerId,
          eventType: NotificationEventType.PAYMENT_REMINDER,
          title: 'Payment required',
          body: 'Previous winner could not complete payment. You can complete the purchase now.',
          relatedEntityType: 'auction',
          relatedEntityId: auction.id,
        });
        this.auctionGateway.emitBidWinner(auction.id, auction.winnerId, {
          finalPrice: Number(fallbackBid.amount),
          premiumAmount: 0,
        });
      } else {
        this.auctionGateway.emitAuctionEnded(auction.id, {
          finalPrice: Number(auction.currentPrice),
          winnerId: null,
          bidCount: auction.bidCount,
        });
      }

      return {
        code: RC.AUCTION_UPDATED,
        message: fallbackBid
          ? 'Auction fallback winner assigned'
          : 'Auction winner payment expired',
        auctionId: auction.id,
        winnerId: auction.winnerId,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async selectFallbackBid(
    manager: EntityManager,
    auction: Auction,
    excludedBidderIds: string[],
  ): Promise<Bid | null> {
    const bids = await manager.find(Bid, {
      where: { auctionId: auction.id, status: Not(BidStatus.CANCELLED) },
      order: { amount: 'DESC', createdAt: 'ASC' },
    });
    const excluded = new Set(excludedBidderIds);

    for (const candidate of bids) {
      if (
        excluded.has(candidate.bidderId) ||
        candidate.status === BidStatus.EXPIRED
      ) {
        continue;
      }

      const reserveSatisfied = this.isReserveMet(
        auction.reservePrice,
        this.getBidMaxAmount(candidate),
      );
      if (
        auction.reservePrice !== null &&
        auction.reservePrice !== undefined &&
        !reserveSatisfied
      ) {
        continue;
      }

      candidate.status = BidStatus.WON;
      candidate.isWinningBid = true;
      await manager.save(candidate);

      auction.winnerId = candidate.bidderId;
      auction.winningBidId = candidate.id;
      auction.currentPrice = Number(candidate.amount);
      auction.winnerPaymentStatus = AuctionPaymentStatus.PENDING;
      auction.winnerPaymentDeadlineAt = this.buildWinnerPaymentDeadline();
      auction.winnerPaymentCompletedAt = null;
      auction.orderId = null;
      auction.fallbackRound = (auction.fallbackRound || 0) + 1;
      auction.paymentAttemptCount = 0;
      auction.reserveMet =
        auction.reservePrice !== null && auction.reservePrice !== undefined;
      return candidate;
    }

    auction.status = AuctionStatus.FAILED;
    auction.winnerId = null;
    auction.winningBidId = null;
    auction.winnerPaymentStatus = AuctionPaymentStatus.EXPIRED;
    auction.winnerPaymentDeadlineAt = null;
    auction.winnerPaymentCompletedAt = null;
    auction.orderId = null;
    return null;
  }

  private buildWinnerPaymentDeadline(): Date {
    return new Date(Date.now() + WINNER_PAYMENT_WINDOW_HOURS * 60 * 60 * 1000);
  }

  private async scheduleWinnerPaymentJobs(
    auctionId: string,
    deadline: Date | null,
    round: number,
  ): Promise<void> {
    if (!deadline) {
      return;
    }

    const expiryDelay = Math.max(0, deadline.getTime() - Date.now());
    await this.auctionQueue.add(
      'winner-payment-expiry',
      { auctionId },
      {
        delay: expiryDelay,
        jobId: `winner-payment-expiry-${auctionId}-r${round}`,
      },
    );

    const reminderDelay =
      expiryDelay - WINNER_PAYMENT_REMINDER_HOURS * 60 * 60 * 1000;
    if (reminderDelay > 0) {
      await this.auctionQueue.add(
        'winner-payment-reminder',
        { auctionId },
        {
          delay: reminderDelay,
          jobId: `winner-payment-reminder-${auctionId}-r${round}`,
        },
      );
    }
  }

  private isWinnerPaymentPending(auction?: Auction | null): boolean {
    return Boolean(
      auction &&
      auction.status === AuctionStatus.ENDED &&
      auction.winnerPaymentStatus === AuctionPaymentStatus.PENDING &&
      auction.winnerId &&
      auction.winningBidId,
    );
  }

  private badRequest(code: string, message: string): BadRequestException {
    const exception = new BadRequestException({ code, message });
    exception.message = message;
    return exception;
  }

  private forbidden(code: string, message: string): ForbiddenException {
    const exception = new ForbiddenException({ code, message });
    exception.message = message;
    return exception;
  }

  private notFound(code: string, message: string): NotFoundException {
    const exception = new NotFoundException({ code, message });
    exception.message = message;
    return exception;
  }

  // ─── Helpers ──────────────────────────────────────────────

  async getBids(auctionId: string) {
    // Withdrawn bids stay in storage for audit, but the public ladder should
    // only show currently effective offers so lead ranking remains accurate.
    // Absentee (ön) teklifler müzayede başlayana kadar mühürlü kalır.
    const bids = await this.bidRepo.find({
      where: {
        auctionId,
        status: Not(In([BidStatus.CANCELLED, BidStatus.ABSENTEE])),
      },
      relations: ['bidder'],
      order: { amount: 'DESC' },
    });

    return {
      code: RC.AUCTION_BIDS_FETCHED,
      message: 'Auction bids fetched',
      bids: bids.map((b) => ({
        id: b.id,
        amount: Number(b.amount),
        maxAmount:
          b.maxAmount !== null && b.maxAmount !== undefined
            ? Number(b.maxAmount)
            : null,
        premiumAmount: 0,
        status: b.status,
        isWinningBid: b.isWinningBid,
        bidderName: b.bidder
          ? `${b.bidder.firstName || ''} ${b.bidder.lastName || ''}`.trim()
          : 'Anonim',
        createdAt: b.createdAt,
      })),
    };
  }

  async findAuctionById(auctionId: string) {
    return this.auctionRepo.findOne({ where: { id: auctionId } });
  }

  async activateAuction(auctionId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction || auction.status !== AuctionStatus.PUBLISHED) return;
    auction.status = AuctionStatus.ACTIVE;
    await this.auctionRepo.save(auction);

    // AUCT-ABS: ön teklifler yarıştırılamasa bile aktivasyon geri alınmaz;
    // teklifler ABSENTEE kalır ve canlı akış temiz başlar.
    try {
      await this.resolveAbsenteeBids(auctionId);
    } catch (error) {
      this.logger.error(
        `Absentee resolution failed for auction ${auctionId}: ${error}`,
      );
    }

    return (
      (await this.auctionRepo.findOne({ where: { id: auctionId } })) ?? auction
    );
  }

  // ─── Absentee (Ön Teklif) Çözümleme (AUCT-ABS) ────────────
  // Müzayede ACTIVE olurken ABSENTEE teklifleri proxy kurallarıyla yarıştırır:
  // en yüksek max kazanır (eşitlikte erken kayıt), görünür fiyat rakip
  // baskısına göre açılır. Hold'u karşılanamayan aday EXPIRED düşer ve
  // sıradaki aday denenir; hiçbiri karşılayamazsa fiyat değişmez.
  async resolveAbsenteeBids(auctionId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let emitPayload: {
      leaderBidderId: string;
      leaderAmount: number;
      bidCount: number;
      endTime: string;
      eventId: string | null;
      outbidBids: { bidderId: string; bidId: string; yourBid: number }[];
    } | null = null;

    try {
      const auction = await queryRunner.manager.findOne(Auction, {
        where: { id: auctionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!auction) {
        await queryRunner.commitTransaction();
        return;
      }

      const absenteeBids = await queryRunner.manager.find(Bid, {
        where: { auctionId, status: BidStatus.ABSENTEE },
        order: { maxAmount: 'DESC', createdAt: 'ASC' },
      });
      if (!absenteeBids.length) {
        await queryRunner.commitTransaction();
        return;
      }

      const currentPrice = Number(auction.currentPrice);
      const minIncrement = Number(auction.minIncrement);
      const minBid = currentPrice + minIncrement;

      const previousLeadBid = await queryRunner.manager.findOne(Bid, {
        where: { auctionId, isWinningBid: true },
      });
      const previousLeadMaxAmount = this.getBidMaxAmount(previousLeadBid);

      // Liderin kendi zayıf ön teklifi fiyatı kendine karşı yükseltmesin.
      const candidates: Bid[] = [];
      for (const bid of absenteeBids) {
        if (
          previousLeadBid &&
          bid.bidderId === previousLeadBid.bidderId &&
          this.getBidMaxAmount(bid) <= previousLeadMaxAmount
        ) {
          bid.status = BidStatus.OUTBID;
          await queryRunner.manager.save(bid);
        } else {
          candidates.push(bid);
        }
      }

      let winner: Bid | null = null;
      let winnerVisibleAmount = 0;

      for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        const candidateMax = this.getBidMaxAmount(candidate);

        const beatsLead =
          !previousLeadBid ||
          candidate.bidderId === previousLeadBid.bidderId ||
          candidateMax > previousLeadMaxAmount ||
          (candidateMax === previousLeadMaxAmount &&
            candidate.createdAt < previousLeadBid.createdAt);
        // Liste max'e göre sıralı — ilk yenilemeyen adaydan sonrası da kaybeder.
        if (!beatsLead) break;

        const challengerMaxes = candidates
          .slice(i + 1)
          .filter((b) => b.bidderId !== candidate.bidderId)
          .map((b) => this.getBidMaxAmount(b));
        if (
          previousLeadBid &&
          previousLeadBid.bidderId !== candidate.bidderId
        ) {
          challengerMaxes.push(previousLeadMaxAmount);
        }
        const challengerMaxAmount = challengerMaxes.length
          ? Math.max(...challengerMaxes)
          : undefined;

        const visibleAmount = this.calculateVisibleWinningAmount({
          leadingMaxAmount: candidateMax,
          challengerMaxAmount,
          requestedAmount: Number(candidate.amount),
          minimumBid: minBid,
          minIncrement,
        });

        winner = candidate;
        winnerVisibleAmount = visibleAmount;
        break;
      }

      const losers = candidates.filter(
        (b) => b !== winner && b.status === BidStatus.ABSENTEE,
      );

      if (winner) {
        const outbidBids: {
          bidderId: string;
          bidId: string;
          yourBid: number;
        }[] = [];

        if (previousLeadBid && previousLeadBid.id !== winner.id) {
          previousLeadBid.isWinningBid = false;
          previousLeadBid.status = BidStatus.OUTBID;
          await queryRunner.manager.save(previousLeadBid);
          if (previousLeadBid.bidderId !== winner.bidderId) {
            outbidBids.push({
              bidderId: previousLeadBid.bidderId,
              bidId: previousLeadBid.id,
              yourBid: Number(previousLeadBid.amount),
            });
          }
        }

        for (const loser of losers) {
          loser.status = BidStatus.OUTBID;
          await queryRunner.manager.save(loser);
          if (loser.bidderId !== winner.bidderId) {
            outbidBids.push({
              bidderId: loser.bidderId,
              bidId: loser.id,
              yourBid: this.getBidMaxAmount(loser),
            });
          }
        }

        winner.amount = winnerVisibleAmount;
        winner.status = BidStatus.ACTIVE;
        winner.isWinningBid = true;
        await queryRunner.manager.save(winner);

        auction.currentPrice = winnerVisibleAmount;
        auction.bidCount = (auction.bidCount || 0) + absenteeBids.length;
        auction.reserveMet = this.isReserveMet(
          auction.reservePrice,
          this.getBidMaxAmount(winner),
        );
        await queryRunner.manager.save(auction);

        emitPayload = {
          leaderBidderId: winner.bidderId,
          leaderAmount: winnerVisibleAmount,
          bidCount: auction.bidCount,
          endTime: auction.endTime.toISOString(),
          eventId: auction.eventId ?? null,
          outbidBids,
        };
      } else if (previousLeadBid && losers.length) {
        // Lider ayakta; en güçlü kaybeden görünür fiyatı yukarı iter.
        const topLoser = losers[0];
        const newVisible = this.calculateVisibleWinningAmount({
          leadingMaxAmount: previousLeadMaxAmount,
          challengerMaxAmount: this.getBidMaxAmount(topLoser),
          requestedAmount: Number(topLoser.amount),
          minimumBid: minBid,
          minIncrement,
        });

        const outbidBids = losers.map((loser) => ({
          bidderId: loser.bidderId,
          bidId: loser.id,
          yourBid: this.getBidMaxAmount(loser),
        }));
        for (const loser of losers) {
          loser.status = BidStatus.OUTBID;
          await queryRunner.manager.save(loser);
        }

        if (newVisible > Number(previousLeadBid.amount)) {
          previousLeadBid.amount = newVisible;
          await queryRunner.manager.save(previousLeadBid);
          auction.currentPrice = newVisible;
        }

        auction.bidCount = (auction.bidCount || 0) + absenteeBids.length;
        await queryRunner.manager.save(auction);

        emitPayload = {
          leaderBidderId: previousLeadBid.bidderId,
          leaderAmount: Number(previousLeadBid.amount),
          bidCount: auction.bidCount,
          endTime: auction.endTime.toISOString(),
          eventId: auction.eventId ?? null,
          outbidBids,
        };
      } else {
        // Hiçbir aday lideri geçemedi — fiyat değişmez, sayaç işler.
        auction.bidCount = (auction.bidCount || 0) + absenteeBids.length;
        await queryRunner.manager.save(auction);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // ─── Post-commit: gateway + bildirimler ───────────────────
    if (!emitPayload) return;

    const bidderName = await this.getBidderName(emitPayload.leaderBidderId);
    this.auctionGateway.emitBidNew(
      auctionId,
      {
        amount: emitPayload.leaderAmount,
        bidderName,
        currentPrice: emitPayload.leaderAmount,
        bidCount: emitPayload.bidCount,
        endTime: emitPayload.endTime,
        serverTime: new Date().toISOString(),
      },
      emitPayload.eventId ?? undefined,
    );

    for (const outbid of emitPayload.outbidBids) {
      this.auctionGateway.emitBidOutbid(
        auctionId,
        outbid.bidderId,
        {
          newAmount: emitPayload.leaderAmount,
          yourBid: outbid.yourBid,
        },
        emitPayload.eventId ?? undefined,
      );
      await this.notificationService?.createFromEvent({
        eventId: `auction-absentee-outbid:${auctionId}:${outbid.bidderId}:${outbid.bidId}`,
        userId: outbid.bidderId,
        eventType: NotificationEventType.AUCTION_OUTBID,
        title: 'Outbid',
        body: 'A higher bid was placed.',
        relatedEntityType: 'auction',
        relatedEntityId: auctionId,
      });
    }
  }

  async getResult(auctionId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
      relations: ['product', 'winner'],
    });
    if (!auction)
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');

    return {
      code: RC.AUCTION_RESULT_FETCHED,
      message: 'Auction result fetched',
      id: auction.id,
      status: auction.status,
      finalPrice: Number(auction.currentPrice),
      buyerPremium: 0,
      bidCount: auction.bidCount,
      reservePrice:
        auction.reservePrice !== null && auction.reservePrice !== undefined
          ? Number(auction.reservePrice)
          : null,
      reserveMet: auction.reserveMet,
      winner: auction.winner
        ? {
            id: auction.winner.id,
            name: `${auction.winner.firstName || ''} ${auction.winner.lastName || ''}`.trim(),
          }
        : null,
      product: auction.product
        ? { id: auction.product.id, title: auction.product.title }
        : null,
      paymentStatus: auction.winnerPaymentStatus,
      saleApprovedAt: auction.saleApprovedAt,
      paymentDeadlineAt: auction.winnerPaymentDeadlineAt,
      paymentCompletedAt: auction.winnerPaymentCompletedAt,
      fallbackRound: auction.fallbackRound,
      paymentAttemptCount: auction.paymentAttemptCount,
      orderId: auction.orderId,
    };
  }

  private async getBidderName(userId: string): Promise<string> {
    const user = await this.userService.findById(userId);
    if (!user) return 'Anonim';
    // Privacy: show first name + first letter of last name
    const firstName = user.firstName || '';
    const lastInitial = user.lastName ? user.lastName.charAt(0) + '.' : '';
    return `${firstName} ${lastInitial}`.trim() || 'Anonim';
  }

  // ─── LOT Number Generation (D-12, AUCT-17) ───────────────

  private async generateLotNumber(
    manager: EntityManager = this.auctionRepo.manager,
  ): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Transaction-scoped advisory lock protects the count + insert sequence.
    await manager.query(
      `SELECT pg_advisory_xact_lock(hashtext('lot_number_gen'))`,
    );

    const count = await manager
      .createQueryBuilder(Auction, 'a')
      .where('a.lotNumber LIKE :prefix', { prefix: `LOT-${yearMonth}-%` })
      .getCount();

    const sequence = String(count + 1).padStart(5, '0');
    return `LOT-${yearMonth}-${sequence}`;
  }

  // ─── Response Builder (BIZ-24) ────────────────────────────

  private toResponse(auction: Auction) {
    const now = new Date();
    const endTime = new Date(auction.endTime);
    const timeLeftMs = Math.max(0, endTime.getTime() - now.getTime());

    return {
      id: auction.id,
      productId: auction.productId,
      productTitle: auction.product?.title || null,
      productImage: auction.product?.imageUrl || null,
      categoryId: auction.product?.categoryId || null,
      categoryName: auction.product?.category?.name || null,
      sellerId: auction.sellerId,
      sellerName: auction.seller
        ? `${auction.seller.firstName || ''} ${auction.seller.lastName || ''}`.trim()
        : null,
      startPrice: Number(auction.startPrice),
      currentPrice: Number(auction.currentPrice),
      minIncrement: Number(auction.minIncrement),
      reservePrice:
        auction.reservePrice !== null && auction.reservePrice !== undefined
          ? Number(auction.reservePrice)
          : null,
      reserveMet: auction.reserveMet,
      buyerPremiumRate: 0,
      status: auction.status,
      auctionType: auction.auctionType,
      startTime: auction.startTime,
      endTime: auction.endTime,
      timeLeftMs,
      serverTime: new Date().toISOString(),
      winnerId: auction.winnerId,
      winnerPaymentStatus: auction.winnerPaymentStatus,
      winnerPaymentDeadlineAt: auction.winnerPaymentDeadlineAt,
      winnerPaymentCompletedAt: auction.winnerPaymentCompletedAt,
      fallbackRound: auction.fallbackRound,
      paymentAttemptCount: auction.paymentAttemptCount,
      orderId: auction.orderId,
      bidCount: auction.bidCount,
      lotNumber: auction.lotNumber,
      antiSnipingEnabled: auction.antiSnipingEnabled,
      extensionSeconds: auction.extensionSeconds,
      maxExtensions: auction.maxExtensions,
      currentExtensions: auction.currentExtensions,
      culturalAssetRestricted: auction.culturalAssetRestricted,
      sequenceNumber: auction.sequenceNumber,
      createdAt: auction.createdAt,
    };
  }

  // ─── COMPLETED Geçişi (ENDED → COMPLETED) ────────────

  async completeAuction(auctionId: string) {
    const auction = await this.auctionRepo.findOne({
      where: { id: auctionId },
    });
    if (!auction)
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    if (auction.status !== AuctionStatus.ENDED) {
      throw this.badRequest(
        RC.VALIDATION_ERROR,
        'Sadece bitmiş müzayedeler tamamlanabilir',
      );
    }

    auction.status = AuctionStatus.COMPLETED;
    await this.auctionRepo.save(auction);
    this.logger.log(`Auction ${auctionId} marked as COMPLETED`);
    return auction;
  }

  private getBidMaxAmount(
    bid?: Pick<Bid, 'maxAmount' | 'amount'> | null,
  ): number {
    if (!bid) {
      return 0;
    }
    return Number(bid.maxAmount ?? bid.amount);
  }

  private isReserveMet(
    reservePrice: number | null | undefined,
    leadingMaxAmount: number,
  ): boolean {
    return (
      reservePrice !== null &&
      reservePrice !== undefined &&
      leadingMaxAmount >= Number(reservePrice)
    );
  }

  private calculateVisibleWinningAmount(input: {
    leadingMaxAmount: number;
    challengerMaxAmount?: number;
    requestedAmount: number;
    minimumBid: number;
    minIncrement: number;
  }): number {
    const challengerPressure =
      input.challengerMaxAmount !== undefined
        ? input.challengerMaxAmount + input.minIncrement
        : 0;
    const nextVisibleAmount = Math.max(
      input.minimumBid,
      input.requestedAmount,
      challengerPressure,
    );
    return Math.min(input.leadingMaxAmount, nextVisibleAmount);
  }

  // ─── Ortak Müzayede Etkinliği (Model 2) Canlı Akış & Yönetici Kontrolleri ───

  async handleSequentialLotProgression(auction: Auction, force = false) {
    if (!auction.eventId || auction.auctionType !== AuctionType.REALTIME) return;

    // Otomatik lot geçişi aktif mi kontrol et (force=true ise bypass et)
    const autoProgress = await this.isAutoProgressEnabled(auction.eventId);
    if (!autoProgress && !force) {
      this.logger.log(`Otomatik lot geçişi kapalı. Event: ${auction.eventId}`);
      // Aktif lot alanını temizle ama etkinliği ACTIVE olarak bırak
      await this.auctionRepo.manager.update(AuctionEvent, auction.eventId, {
        activeLotId: null,
        status: AuctionEventStatus.ACTIVE,
      });

      this.auctionGateway.emitActiveLotChanged(auction.eventId, {
        activeLotId: null,
        lotNumber: null,
        productTitle: null,
        currentPrice: 0,
        endTime: new Date().toISOString(),
      });
      return;
    }

    // Sıradaki onaylanmış Lot'u bul
    let nextLot = await this.auctionRepo
      .createQueryBuilder('a')
      .where('a.eventId = :eventId', { eventId: auction.eventId })
      .andWhere('a.approvalStatus = :status', { status: AuctionApprovalStatus.APPROVED })
      .andWhere('a.sequenceNumber > :seq', { seq: auction.sequenceNumber ?? 0 })
      .andWhere('a.status = :published', { published: AuctionStatus.PUBLISHED })
      .orderBy('a.sequenceNumber', 'ASC')
      .getOne();

    // Eğer sequenceNumber ile bulunamadıysa, herhangi bir tamamlanmamış APPROVED lotu yedek olarak bul
    if (!nextLot) {
      nextLot = await this.auctionRepo
        .createQueryBuilder('a')
        .where('a.eventId = :eventId', { eventId: auction.eventId })
        .andWhere('a.approvalStatus = :status', { status: AuctionApprovalStatus.APPROVED })
        .andWhere('a.id != :currentId', { currentId: auction.id })
        .andWhere('a.status IN (:...pendingStatuses)', {
          pendingStatuses: [AuctionStatus.PUBLISHED, AuctionStatus.DRAFT],
        })
        .orderBy('a.sequenceNumber', 'ASC')
        .getOne();
    }

    if (nextLot) {
      // Müzayede odasının transition bekleme süresini alalım
      const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
        where: { id: auction.eventId },
      });
      const transitionSeconds = event?.lotTransitionSeconds ?? 30;

      // Etkinliğin aktif Lot alanını güncelle ama durumunu ACTIVE yapma
      await this.auctionRepo.manager.update(AuctionEvent, auction.eventId, {
        activeLotId: nextLot.id,
      });

      const product = await this.auctionRepo.manager.findOne('Product', {
        where: { id: nextLot.productId },
      }) as any;

      const transitionEndTime = new Date(Date.now() + transitionSeconds * 1000).toISOString();

      // WebSocket odasına bekleme (geçiş) bildirimini gönder
      this.auctionGateway.emitLotTransition(auction.eventId, {
        nextLotId: nextLot.id,
        lotNumber: nextLot.lotNumber,
        productTitle: product?.title ?? null,
        transitionSeconds,
        transitionEndTime,
      });

      // BullMQ ile sonraki lotu başlatacak gecikmeli job planla
      await this.auctionQueue.add(
        'start-next-lot',
        { eventId: auction.eventId, nextLotId: nextLot.id },
        { delay: transitionSeconds * 1000, jobId: `start-next-${nextLot.id}` }
      );
    } else {
      // Sıradaki lot yok. Gerçekten tamamlanmamış lot var mı diye kontrol et (onaylı olsun olmasın)
      const unfinishedLotsCount = await this.auctionRepo
        .createQueryBuilder('a')
        .where('a.eventId = :eventId', { eventId: auction.eventId })
        .andWhere('a.status NOT IN (:...endedStatuses)', {
          endedStatuses: [
            AuctionStatus.ENDED,
            AuctionStatus.COMPLETED,
            AuctionStatus.CANCELLED,
            AuctionStatus.FAILED,
          ],
        })
        .getCount();

      if (unfinishedLotsCount > 0) {
        this.logger.log(`Müzayede ${auction.eventId} içinde ${unfinishedLotsCount} tamamlanmamış lot var. Etkinlik sonlandırılmıyor.`);
        
        await this.auctionRepo.manager.update(AuctionEvent, auction.eventId, {
          activeLotId: null,
          status: AuctionEventStatus.ACTIVE,
        });

        this.auctionGateway.emitActiveLotChanged(auction.eventId, {
          activeLotId: null,
          lotNumber: null,
          productTitle: null,
          currentPrice: 0,
          endTime: new Date().toISOString(),
        });
      } else {
        // Etkinlikteki tüm Lot'lar tamamlandı! Etkinliği sonlandır
        await this.auctionRepo.manager.update(AuctionEvent, auction.eventId, {
          activeLotId: null,
          status: AuctionEventStatus.ENDED,
        });
        this.auctionGateway.emitEventStatusChanged(auction.eventId, { status: AuctionEventStatus.ENDED });
      }
    }
  }

  async startNextLot(eventId: string, nextLotId: string) {
    const lot = await this.auctionRepo.findOne({ where: { id: nextLotId } });
    if (!lot) return;

    // Eğer lot zaten aktifse veya bitmişse işlem yapma (örn: admin skip etmiş olabilir)
    if (
      lot.status === AuctionStatus.ACTIVE ||
      lot.status === AuctionStatus.ENDED ||
      lot.status === AuctionStatus.COMPLETED
    ) {
      return;
    }

    const now = new Date();
    lot.startTime = now;
    lot.endTime = new Date(now.getTime() + 5 * 60 * 1000); // Varsayılan 5 dakika canlı ihale süresi
    lot.status = AuctionStatus.ACTIVE;
    await this.auctionRepo.save(lot);

    // AUCT-ABS: lot canlıya dönerken ön teklifleri yarıştır.
    try {
      await this.resolveAbsenteeBids(lot.id);
    } catch (error) {
      this.logger.error(
        `Absentee resolution failed for lot ${lot.id}: ${error}`,
      );
    }
    const resolvedLot = await this.auctionRepo.findOne({
      where: { id: lot.id },
    });

    await this.auctionRepo.manager.update(AuctionEvent, eventId, {
      activeLotId: lot.id,
      status: AuctionEventStatus.ACTIVE,
    });

    const product = await this.auctionRepo.manager.findOne('Product', {
      where: { id: lot.productId },
    }) as any;

    this.auctionGateway.emitActiveLotChanged(eventId, {
      activeLotId: lot.id,
      lotNumber: lot.lotNumber,
      productTitle: product?.title ?? null,
      currentPrice: Number(resolvedLot?.currentPrice ?? lot.startPrice),
      endTime: lot.endTime.toISOString(),
    });

    this.auctionGateway.emitEventStatusChanged(eventId, { status: 'ACTIVE' });

    const delay = lot.endTime.getTime() - Date.now();
    await this.auctionQueue.add(
      'end-auction',
      { auctionId: lot.id },
      { delay: Math.max(0, delay), jobId: `end-${lot.id}` }
    );
  }

  async pauseAuction(eventId: string) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event || event.status !== AuctionEventStatus.ACTIVE || !event.activeLotId) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Aktif müzayede odası bulunamadı veya duraklatılamaz',
      });
    }

    const lot = await this.auctionRepo.findOne({ where: { id: event.activeLotId } });
    if (!lot || lot.status !== AuctionStatus.ACTIVE) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Aktif Lot bulunamadı',
      });
    }

    const remainingMs = lot.endTime.getTime() - Date.now();
    lot.status = AuctionStatus.PUBLISHED; // Bids can't be placed while paused
    lot.pausedRemainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    await this.auctionRepo.save(lot);

    // Bitiş BullMQ görevini kaldır
    await this.removeQueueJob(`end-${lot.id}`);

    this.auctionGateway.emitEventStatusChanged(eventId, { status: 'PAUSED' });
    return { code: RC.SUCCESS, message: 'Müzayede duraklatıldı' };
  }

  async resumeAuction(eventId: string) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event || !event.activeLotId) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Müzayede etkinliği aktif değil',
      });
    }

    const lot = await this.auctionRepo.findOne({ where: { id: event.activeLotId } });
    if (!lot || lot.status !== AuctionStatus.PUBLISHED) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Duraklatılmış Lot bulunamadı',
      });
    }

    const remainingSec = lot.pausedRemainingSeconds ?? 60;
    lot.pausedRemainingSeconds = null;
    const now = new Date();
    lot.status = AuctionStatus.ACTIVE;
    lot.endTime = new Date(now.getTime() + remainingSec * 1000);
    await this.auctionRepo.save(lot);

    // BullMQ görevini yeniden programla. Aynı jobId tamamlanmış set'te
    // bekliyorsa BullMQ eklemeyi sessizce yutar ve lot hiç bitmez — önce sil.
    await this.removeQueueJob(`end-${lot.id}`);
    await this.auctionQueue.add(
      'end-auction',
      { auctionId: lot.id },
      { delay: remainingSec * 1000, jobId: `end-${lot.id}` }
    );

    const product = await this.auctionRepo.manager.findOne('Product', {
      where: { id: lot.productId },
    }) as any;

    this.auctionGateway.emitActiveLotChanged(eventId, {
      activeLotId: lot.id,
      lotNumber: lot.lotNumber,
      productTitle: product?.title ?? null,
      currentPrice: Number(lot.currentPrice),
      endTime: lot.endTime.toISOString(),
    });

    this.auctionGateway.emitEventStatusChanged(eventId, { status: 'ACTIVE' });
    return { code: RC.SUCCESS, message: 'Müzayede devam ettiriliyor' };
  }

  // Sunucu anonsu: "ürün yakılıyor / son ve adil çağrı / satıyorum sattım".
  // Sadece feed'e düşen ritüel mesajıdır; satışı skipLot/finalize kapatır.
  async announceLot(eventId: string, type: string, message?: string) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Müzayede odası bulunamadı',
      });
    }

    const defaultMessages: Record<string, string> = {
      BURNING: 'Ürün yakılıyor!',
      LAST_CALL: 'Son ve adil çağrı!',
      SOLD: 'Satıyorum... Sattım!',
    };
    const resolvedMessage = message?.trim() || defaultMessages[type];
    if (!resolvedMessage) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Geçersiz anons türü — BURNING, LAST_CALL, SOLD veya özel mesaj gerekli',
      });
    }

    this.auctionGateway.emitAuctioneerAnnouncement(eventId, {
      type,
      message: resolvedMessage,
      lotId: event.activeLotId ?? null,
    });

    return { code: RC.SUCCESS, message: 'Anons yayınlandı', announcement: resolvedMessage };
  }

  async skipLot(eventId: string) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Müzayede odası bulunamadı',
      });
    }

    if (event.activeLotId) {
      const lot = await this.auctionRepo.findOne({ where: { id: event.activeLotId } });
      if (!lot) return { code: RC.SUCCESS };

      if (lot.status === AuctionStatus.ACTIVE) {
        // Normal skip: Aktif lotu sonlandır
        lot.endTime = new Date(Date.now() - 1000);
        await this.auctionRepo.save(lot);

        await this.removeQueueJob(`end-${lot.id}`);

        await this.finalizeAuction(lot.id, true);
        return { code: RC.SUCCESS, message: 'Sıradaki Lot\'a geçildi' };
      } else {
        // Geçiş aşaması (Transition): Bekleyen job'ı iptal et ve hemen başlat
        await this.removeQueueJob(`start-next-${lot.id}`);

        await this.startNextLot(event.id, lot.id);
        return { code: RC.SUCCESS, message: 'Bekleme süresi atlandı ve Lot başlatıldı' };
      }
    } else {
      // Sıradaki onaylı ve yayınlanmış lotu bul
      let nextLot = await this.auctionRepo
        .createQueryBuilder('a')
        .where('a.eventId = :eventId', { eventId: event.id })
        .andWhere('a.approvalStatus = :status', { status: AuctionApprovalStatus.APPROVED })
        .andWhere('a.status = :published', { published: AuctionStatus.PUBLISHED })
        .orderBy('a.sequenceNumber', 'ASC')
        .getOne();

      if (!nextLot) {
        nextLot = await this.auctionRepo
          .createQueryBuilder('a')
          .where('a.eventId = :eventId', { eventId: event.id })
          .andWhere('a.approvalStatus = :status', { status: AuctionApprovalStatus.APPROVED })
          .andWhere('a.status IN (:...pendingStatuses)', {
            pendingStatuses: [AuctionStatus.PUBLISHED, AuctionStatus.DRAFT],
          })
          .orderBy('a.sequenceNumber', 'ASC')
          .getOne();
      }

      if (nextLot) {
        const now = new Date();
        nextLot.startTime = now;
        nextLot.endTime = new Date(now.getTime() + 5 * 60 * 1000);
        nextLot.status = AuctionStatus.ACTIVE;
        await this.auctionRepo.save(nextLot);

        await this.auctionRepo.manager.update(AuctionEvent, event.id, {
          activeLotId: nextLot.id,
          status: AuctionEventStatus.ACTIVE,
        });

        const product = await this.auctionRepo.manager.findOne('Product', {
          where: { id: nextLot.productId },
        }) as any;

        this.auctionGateway.emitActiveLotChanged(event.id, {
          activeLotId: nextLot.id,
          lotNumber: nextLot.lotNumber,
          productTitle: product?.title ?? null,
          currentPrice: Number(nextLot.startPrice),
          endTime: nextLot.endTime.toISOString(),
        });

        const delay = nextLot.endTime.getTime() - Date.now();
        // Tamamlanmış set'teki aynı jobId eklemeyi sessizce yutmasın.
        await this.removeQueueJob(`end-${nextLot.id}`);
        await this.auctionQueue.add(
          'end-auction',
          { auctionId: nextLot.id },
          { delay: Math.max(0, delay), jobId: `end-${nextLot.id}` }
        );

        this.auctionGateway.emitEventStatusChanged(event.id, { status: AuctionEventStatus.ACTIVE });
        return { code: RC.SUCCESS, message: 'Sıradaki Lot başlatıldı' };
      } else {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Müzayedede başlatılacak onaylı lot kalmadı',
        });
      }
    }
  }

  async isAutoProgressEnabled(eventId: string): Promise<boolean> {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    return event?.autoProgressEnabled !== false; // defaults to true
  }

  async setAutoProgress(eventId: string, enabled: boolean) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event) {
      throw this.notFound(RC.NOT_FOUND, 'Müzayede etkinliği bulunamadı');
    }
    await this.auctionRepo.manager.update(AuctionEvent, eventId, {
      autoProgressEnabled: enabled,
    });
    this.auctionGateway.emitEventAutoProgressChanged(eventId, enabled);
    return {
      code: RC.SUCCESS,
      message: `Otomatik geçiş ${enabled ? 'açıldı' : 'kapatıldı'}`,
      enabled,
    };
  }

  async getPausedRemainingSeconds(lotId: string): Promise<number | undefined> {
    const lot = await this.auctionRepo.findOne({ where: { id: lotId } });
    return lot?.pausedRemainingSeconds ?? undefined;
  }

  async getIcsContent(id: string): Promise<string> {
    const auction = await this.auctionRepo.findOne({
      where: { id },
      relations: ['product'],
    });
    if (!auction) {
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    }

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    const start = formatDate(new Date(auction.startTime));
    const end = formatDate(new Date(auction.endTime));
    const title = auction.product?.title || 'Müzayede';
    const details = `Endemigo Muzayede Ilani: ${auction.product?.description || ''}\\nLink: https://endemigo.com/auctions/${id}`;

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `URL:https://endemigo.com/auctions/${id}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:${details}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');
  }

  async registerToAuction(userId: string, auctionId: string, dto?: RegisterToAuctionDto) {
    const auction = await this.auctionRepo.findOne({ where: { id: auctionId } });
    if (!auction) {
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    }

    const bidder = await this.userService.findById(userId);
    if (!bidder?.isActive) {
      throw this.forbidden(RC.ACCOUNT_DISABLED, 'Kullanıcı bulunamadı veya devre dışı');
    }

    // Check if there is already a registration (either for this specific auction, or for the event it belongs to)
    let registration = await this.registrationRepo.findOne({
      where: [
        { userId, auctionId },
        ...(auction.eventId ? [{ userId, eventId: auction.eventId }] : []),
      ],
    });

    if (registration && registration.status === AuctionRegistrationStatus.APPROVED) {
      return {
        code: RC.SUCCESS,
        message: 'Müzayede katılım kaydı zaten onaylanmış',
        registration,
      };
    }

    // Check if user has saved cards
    const savedCardsRes = await this.paymentService.listSavedCards(userId);
    const hasSavedCard = savedCardsRes.cards && savedCardsRes.cards.length > 0;

    let hasVerifiedCard = hasSavedCard;
    let cardRegistered = false;

    // If card details are supplied in the request, register the new card (simulating 1 TL validation charge and refund)
    if (dto && dto.cardNumber && dto.cardHolderName && dto.expireMonth && dto.expireYear && dto.cvc) {
      try {
        await this.paymentService.registerCard(userId, {
          cardHolderName: dto.cardHolderName,
          cardNumber: dto.cardNumber,
          expireMonth: dto.expireMonth,
          expireYear: dto.expireYear,
          cvc: dto.cvc,
        });
        hasVerifiedCard = true;
        cardRegistered = true;
      } catch (err) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: err.message || 'Kredi kartı doğrulanamadı',
        });
      }
    }

    if (!hasVerifiedCard) {
      throw new BadRequestException({
        code: RC.AUCTION_REGISTRATION_REQUIRED,
        message: 'Müzayedeye katılabilmek için doğrulanmış bir kredi kartınızın bulunması gerekmektedir.',
      });
    }

    // High-value entry deposit check
    if (auction.requiredDeposit > 0) {
      try {
        await this.paymentService.payDeposit(userId, {
          amount: auction.requiredDeposit,
          cardDetails: cardRegistered && dto ? {
            cardHolderName: dto.cardHolderName!,
            cardNumber: dto.cardNumber!,
            expireMonth: dto.expireMonth!,
            expireYear: dto.expireYear!,
            cvc: dto.cvc!,
          } : undefined,
        });
      } catch (err) {
        throw new BadRequestException({
          code: RC.AUCTION_REGISTRATION_REQUIRED,
          message: `Müzayede giriş depozitosu (${auction.requiredDeposit} TL) tahsil edilemedi: ${err.message}`,
        });
      }
    }

    // Kayıt PENDING açılır — her müzayedede katılım talebi sistem/admin
    // tarafından ayrıca onaylanır (şartname kabulü + uygunluk kontrolü).
    if (!registration) {
      registration = this.registrationRepo.create({
        userId,
        auctionId: auction.eventId ? null : auctionId,
        eventId: auction.eventId || null,
        status: AuctionRegistrationStatus.PENDING,
        acceptedTermsAt: new Date(),
      });
    } else if (registration.status === AuctionRegistrationStatus.REJECTED) {
      registration.status = AuctionRegistrationStatus.PENDING;
    }

    const saved = await this.registrationRepo.save(registration);
    return {
      code: RC.AUCTION_REGISTRATION_PENDING,
      message:
        'Kredi kartınız doğrulandı, katılım talebiniz alındı. Onaylandığında bildirim alacaksınız.',
      registration: saved,
    };
  }

  async getRegistrationStatus(userId: string, auctionId: string) {
    const auction = await this.auctionRepo.findOne({ where: { id: auctionId } });
    if (!auction) {
      throw this.notFound(RC.AUCTION_NOT_FOUND, 'Müzayede bulunamadı');
    }

    const registration = await this.registrationRepo.findOne({
      where: [
        { userId, auctionId },
        ...(auction.eventId ? [{ userId, eventId: auction.eventId }] : []),
      ],
    });

    return {
      code: RC.AUCTION_REGISTRATION_STATUS,
      message: 'Müzayede katılım durumu getirildi',
      registration,
    };
  }

  async listRegistrationsForAdmin(status?: AuctionRegistrationStatus, page = 1, limit = 20) {
    const queryBuilder = this.registrationRepo.createQueryBuilder('reg')
      .leftJoinAndSelect('reg.user', 'user')
      .leftJoinAndSelect('reg.auction', 'auction')
      .leftJoinAndSelect('auction.product', 'product')
      .leftJoinAndSelect('reg.event', 'event')
      .orderBy('reg.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      queryBuilder.andWhere('reg.status = :status', { status });
    }

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      code: RC.SUCCESS,
      message: 'Müzayede katılım talepleri listelendi',
      items,
      pagination: {
        page,
        limit,
        total,
      },
    };
  }

  async updateRegistrationStatus(registrationId: string, status: AuctionRegistrationStatus, adminId?: string) {
    const registration = await this.registrationRepo.findOne({
      where: { id: registrationId },
    });
    if (!registration) {
      throw this.notFound(RC.AUCTION_REGISTRATION_NOT_FOUND, 'Müzayede katılım kaydı bulunamadı');
    }

    registration.status = status;
    const saved = await this.registrationRepo.save(registration);

    await this.notificationService?.createFromEvent({
      eventId: `auction-registration:${saved.id}:${status}`,
      userId: saved.userId,
      eventType: NotificationEventType.AUCTION_STARTED,
      title:
        status === AuctionRegistrationStatus.APPROVED
          ? 'Müzayede katılımınız onaylandı'
          : 'Müzayede katılımınız reddedildi',
      body:
        status === AuctionRegistrationStatus.APPROVED
          ? 'Artık pey verebilirsiniz. Canlı yayın için hatırlatıcı kurabilirsiniz.'
          : 'Onaylanmak için müşteri ilişkilerine mesaj yazabilir veya arayabilirsiniz.',
      relatedEntityType: 'auction',
      relatedEntityId: saved.auctionId ?? saved.eventId ?? saved.id,
    });

    const code = status === AuctionRegistrationStatus.APPROVED
      ? RC.AUCTION_REGISTRATION_APPROVED_SUCCESS
      : RC.AUCTION_REGISTRATION_REJECTED_SUCCESS;

    const message = status === AuctionRegistrationStatus.APPROVED
      ? 'Müzayede katılımı onaylandı'
      : 'Müzayede katılımı reddedildi';

    return {
      code,
      message,
      registration: saved,
    };
  }

  async acceptPreContract(userId: string, eventType: 'INDEPENDENT' | 'JOINT') {
    return this.userService.acceptPreContract(userId, eventType);
  }

  async createEvent(
    sellerId: string,
    dto: {
      title: string;
      description?: string;
      coverImageUrl?: string;
      categoryId?: string;
      auctionType?: AuctionType;
      startTime: string;
      endTime: string;
      submissionDeadline?: string;
      eventType: AuctionEventSystemType;
      jointManagementType?: JointManagementType;
      minProductsCount?: number;
      maxProductsCount?: number;
    },
  ) {
    const profileRes = await this.userService.getSellerProfile(sellerId);
    const profile = profileRes.sellerProfile;

    const activeProductCount = await this.auctionRepo.manager.count('Product', {
      where: { sellerId, status: ProductStatus.ACTIVE },
    });

    if (dto.eventType === AuctionEventSystemType.INDEPENDENT) {
      if (!profile.independentPreContractAcceptedAt) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Müzayede oluşturabilmek için önce ön sözleşmeyi kabul etmelisiniz',
        });
      }
      // Bağımsız müzayede: en az 40 aktif ürünü olan tedarikçi açabilir.
      if (activeProductCount < 40) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: `Bağımsız müzayede açabilmek için en az 40 aktif ürününüz olmalıdır. Mevcut: ${activeProductCount}`,
        });
      }
    } else if (dto.eventType === AuctionEventSystemType.JOINT) {
      if (!profile.jointPreContractAcceptedAt) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Ortak müzayede oluşturabilmek için önce ön sözleşmeyi kabul etmelisiniz',
        });
      }
      // Kreatör müzayedeci rolü admin onayıyla verilir (en zor kazanılan rol).
      if (!profile.canCreateJoint) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Ortak müzayede düzenleme yetkiniz bulunmuyor. Kreatör müzayedeci başvurusu için müşteri ilişkileriyle iletişime geçin.',
        });
      }
      // Organizatörün kendisinin de en az 20 aktif ürünü olmalı.
      if (activeProductCount < 20) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: `Ortak müzayede açabilmek için en az 20 aktif ürününüz olmalıdır. Mevcut: ${activeProductCount}`,
        });
      }
    } else {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Tedarikçiler sadece Bağımsız veya Ortak müzayede oluşturabilir',
      });
    }

    const event = new AuctionEvent();
    event.title = dto.title;
    event.description = dto.description ?? null;
    event.coverImageUrl = dto.coverImageUrl ?? null;
    event.categoryId = dto.categoryId ?? null;
    event.status = AuctionEventStatus.DRAFT;
    event.auctionType = dto.auctionType || AuctionType.REALTIME;
    event.startTime = new Date(dto.startTime);
    event.endTime = new Date(dto.endTime);
    event.submissionDeadline = dto.submissionDeadline ? new Date(dto.submissionDeadline) : null;
    event.activeLotId = null;
    event.ownerId = sellerId;
    event.eventType = dto.eventType;
    event.jointManagementType = dto.jointManagementType ?? null;
    event.minProductsCount = dto.minProductsCount ?? (dto.eventType === AuctionEventSystemType.INDEPENDENT ? 40 : 60);
    event.maxProductsCount = dto.maxProductsCount ?? (dto.eventType === AuctionEventSystemType.INDEPENDENT ? 0 : 100);

    const saved = await this.auctionRepo.manager.save(AuctionEvent, event);
    return {
      code: RC.SUCCESS,
      message: 'Müzayede etkinliği oluşturuldu. Admin onayı bekleniyor.',
      event: saved,
    };
  }

  // ─── Açık ürün çağrısı (JOINT): davetsiz katılım kapısını aç/kapat ───
  async setOpenCall(eventId: string, sellerId: string, enabled: boolean) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Müzayede etkinliği bulunamadı',
      });
    }
    if (event.ownerId !== sellerId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Sadece etkinlik sahibi ürün çağrısını yönetebilir',
      });
    }
    if (event.eventType !== AuctionEventSystemType.JOINT) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Ürün çağrısı sadece ortak müzayedelerde açılabilir',
      });
    }
    if (![AuctionEventStatus.DRAFT, AuctionEventStatus.APPLICATION].includes(event.status)) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Ürün çağrısı sadece taslak/başvuru aşamasındaki etkinliklerde değiştirilebilir',
      });
    }

    event.openCallEnabled = enabled;
    await this.auctionRepo.manager.save(AuctionEvent, event);
    return {
      code: RC.SUCCESS,
      message: enabled
        ? 'Ürün çağrısı açıldı — en az 20 aktif ürünü olan tedarikçiler başvurabilir'
        : 'Ürün çağrısı kapatıldı',
      openCallEnabled: enabled,
    };
  }

  // ─── Organizatör lot onayı (JOINT): kendi etkinliğine gelen lotları yönetir ───
  async organizerApproveLot(
    eventId: string,
    lotId: string,
    sellerId: string,
    status: AuctionApprovalStatus,
    reason?: string,
  ) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Müzayede etkinliği bulunamadı',
      });
    }
    if (event.ownerId !== sellerId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Sadece etkinlik sahibi lotları onaylayabilir',
      });
    }
    if (event.eventType !== AuctionEventSystemType.JOINT) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Organizatör lot onayı sadece ortak müzayedelerde geçerlidir',
      });
    }
    if (![AuctionApprovalStatus.APPROVED, AuctionApprovalStatus.REJECTED].includes(status)) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Geçersiz onay durumu',
      });
    }

    const lot = await this.auctionRepo.findOne({
      where: { id: lotId, eventId },
      relations: ['product'],
    });
    if (!lot) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Lot bu etkinlikte bulunamadı',
      });
    }
    if (lot.approvalStatus !== AuctionApprovalStatus.PENDING) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Sadece onay bekleyen lotlar karara bağlanabilir',
      });
    }

    lot.approvalStatus = status;
    if (status === AuctionApprovalStatus.APPROVED) {
      const maxSequence = await this.auctionRepo
        .createQueryBuilder('a')
        .where('a.eventId = :eventId', { eventId })
        .andWhere('a.approvalStatus = :status', { status: AuctionApprovalStatus.APPROVED })
        .select('MAX(a.sequenceNumber)', 'max')
        .getRawOne<{ max: number | null }>();
      lot.sequenceNumber = (maxSequence?.max ?? 0) + 1;
      lot.status = AuctionStatus.PUBLISHED;
    } else {
      lot.status = AuctionStatus.CANCELLED;
    }
    const saved = await this.auctionRepo.save(lot);

    await this.notificationService?.createFromEvent({
      eventId: `organizer-lot-approval:${lot.id}:${status}`,
      userId: lot.sellerId,
      eventType: NotificationEventType.AUCTION_STARTED,
      title:
        status === AuctionApprovalStatus.APPROVED
          ? 'Lot başvurunuz onaylandı'
          : 'Lot başvurunuz reddedildi',
      body:
        status === AuctionApprovalStatus.APPROVED
          ? `"${lot.product?.title ?? 'Ürününüz'}" ortak müzayede kataloğuna eklendi.`
          : `"${lot.product?.title ?? 'Ürününüz'}" başvurusu organizatör tarafından reddedildi.${reason ? ` Neden: ${reason}` : ''}`,
      relatedEntityType: 'auction',
      relatedEntityId: lot.id,
    });

    return {
      code: RC.SUCCESS,
      message:
        status === AuctionApprovalStatus.APPROVED
          ? 'Lot onaylandı ve kataloğa eklendi'
          : 'Lot reddedildi',
      auction: saved,
    };
  }

  async submitEventForApproval(eventId: string, sellerId: string) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Müzayede etkinliği bulunamadı',
      });
    }

    if (event.ownerId !== sellerId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Sadece müzayede sahibi bu işlemi yapabilir',
      });
    }

    if (event.status !== AuctionEventStatus.DRAFT) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Sadece taslak aşamasındaki müzayedeler onaya sunulabilir',
      });
    }

    const lots = await this.auctionRepo.find({ where: { eventId } });

    if (event.eventType === AuctionEventSystemType.INDEPENDENT) {
      if (lots.length < 40) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: `Bağımsız müzayede oluşturabilmek için en az 40 ürün eklemelisiniz. Mevcut: ${lots.length}`,
        });
      }
    } else if (event.eventType === AuctionEventSystemType.JOINT) {
      if (lots.length < 60 || lots.length > 100) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: `Ortak müzayede en az 60, en fazla 100 ürünle açılabilir. Mevcut: ${lots.length}`,
        });
      }

      // Her katılımcının en az 20 ürün eklediğini doğrula
      const countsMap = new Map<string, number>();
      lots.forEach((l) => {
        countsMap.set(l.sellerId, (countsMap.get(l.sellerId) || 0) + 1);
      });

      for (const [sId, count] of countsMap.entries()) {
        if (count < 20) {
          throw new BadRequestException({
            code: RC.VALIDATION_ERROR,
            message: `Tedarikçi (ID: ${sId}) ortak müzayedeye en az 20 ürün ile katılmalıdır. Mevcut: ${count}`,
          });
        }
      }
    }

    event.status = AuctionEventStatus.APPLICATION;
    const saved = await this.auctionRepo.manager.save(AuctionEvent, event);

    return {
      code: RC.SUCCESS,
      message: 'Müzayede etkinliği onaya sunuldu',
      event: saved,
    };
  }

  async sendInvitation(
    eventId: string,
    hostSellerId: string,
    inviteeId?: string,
    inviteeEmail?: string,
  ) {
    const event = await this.auctionRepo.manager.findOne(AuctionEvent, {
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Müzayede etkinliği bulunamadı',
      });
    }

    // E-posta ile davet: organizatör UUID bilmek zorunda değil.
    if (!inviteeId && inviteeEmail) {
      const byEmail = await this.userService.findByEmail(inviteeEmail.trim().toLowerCase());
      if (!byEmail) {
        throw new BadRequestException({
          code: RC.VALIDATION_ERROR,
          message: 'Bu e-posta ile kayıtlı bir kullanıcı bulunamadı',
        });
      }
      inviteeId = byEmail.id;
    }
    if (!inviteeId) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Davet için tedarikçi e-postası veya ID gereklidir',
      });
    }

    if (event.eventType !== AuctionEventSystemType.JOINT || event.ownerId !== hostSellerId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Sadece kendi düzenlediğiniz ortak müzayedeler için davet gönderebilirsiniz',
      });
    }

    if (event.status !== AuctionEventStatus.DRAFT) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Sadece taslak durumundaki müzayedeler için davet gönderebilirsiniz',
      });
    }

    // Check if invitee exists and is seller
    const invitee = await this.userService.findById(inviteeId);
    if (!invitee || !invitee.isSeller) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Davet edilen kullanıcı aktif bir satıcı olmalıdır',
      });
    }

    // Check if invitee has at least 20 active products
    const productsCount = await this.auctionRepo.manager.count('Product', {
      where: { sellerId: inviteeId, status: ProductStatus.ACTIVE },
    });
    if (productsCount < 20) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Davet edilecek tedarikçinin sistemde en az 20 ürünü bulunmalıdır',
      });
    }

    // Check if already invited
    const existing = await this.auctionRepo.manager.findOne(AuctionEventInvitation, {
      where: { eventId, inviteeId },
    });
    if (existing) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Bu tedarikçi zaten bu müzayedeye davet edilmiş',
      });
    }

    const invitation = this.auctionRepo.manager.create(AuctionEventInvitation, {
      eventId,
      inviteeId,
      status: InvitationStatus.PENDING,
    });

    const saved = await this.auctionRepo.manager.save(AuctionEventInvitation, invitation);

    // Davetli haberdar edilmezse davet ölü kalır — bildirim zorunlu adım.
    await this.notificationService?.createFromEvent({
      eventId: `auction-invitation:${saved.id}`,
      userId: inviteeId,
      eventType: NotificationEventType.AUCTION_STARTED,
      title: 'Ortak müzayede daveti',
      body: `"${event.title}" ortak müzayedesine davet edildiniz. Kabul ederek en az 20 ürünle katılabilirsiniz.`,
      relatedEntityType: 'auction_event',
      relatedEntityId: eventId,
    });

    return {
      code: RC.SUCCESS,
      message: 'Davet gönderildi',
      invitation: saved,
    };
  }

  // Organizatör bekleyen daveti geri çeker (davetlinin reddi değil).
  async cancelInvitation(invitationId: string, requesterId: string) {
    const invitation = await this.auctionRepo.manager.findOne(AuctionEventInvitation, {
      where: { id: invitationId },
      relations: ['event'],
    });
    if (!invitation) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Davet bulunamadı',
      });
    }
    if (invitation.event?.ownerId !== requesterId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Sadece etkinlik sahibi daveti geri çekebilir',
      });
    }
    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Sadece beklemedeki davetler geri çekilebilir',
      });
    }

    invitation.status = InvitationStatus.EXPIRED;
    const saved = await this.auctionRepo.manager.save(AuctionEventInvitation, invitation);
    return {
      code: RC.SUCCESS,
      message: 'Davet geri çekildi',
      invitation: saved,
    };
  }

  async acceptInvitation(invitationId: string, inviteeId: string) {
    const invitation = await this.auctionRepo.manager.findOne(AuctionEventInvitation, {
      where: { id: invitationId },
      relations: ['event'],
    });
    if (!invitation) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Davet bulunamadı',
      });
    }

    if (invitation.inviteeId !== inviteeId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Bu davet size ait değil',
      });
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Sadece beklemedeki davetler kabul edilebilir',
      });
    }

    // Double check product count
    const productsCount = await this.auctionRepo.manager.count('Product', {
      where: { sellerId: inviteeId, status: ProductStatus.ACTIVE },
    });
    if (productsCount < 20) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Katılabilmek için en az 20 ürününüz bulunmalıdır',
      });
    }

    invitation.status = InvitationStatus.ACCEPTED;
    const saved = await this.auctionRepo.manager.save(AuctionEventInvitation, invitation);

    // Organizatör katılımcının kararından haberdar olur.
    if (invitation.event?.ownerId) {
      await this.notificationService?.createFromEvent({
        eventId: `auction-invitation-accepted:${saved.id}`,
        userId: invitation.event.ownerId,
        eventType: NotificationEventType.AUCTION_STARTED,
        title: 'Davet kabul edildi',
        body: `"${invitation.event.title}" müzayedenize bir tedarikçi katıldı. Artık lot ekleyebilir.`,
        relatedEntityType: 'auction_event',
        relatedEntityId: invitation.eventId,
      });
    }

    return {
      code: RC.SUCCESS,
      message: 'Davet kabul edildi',
      invitation: saved,
    };
  }

  async rejectInvitation(invitationId: string, inviteeId: string) {
    const invitation = await this.auctionRepo.manager.findOne(AuctionEventInvitation, {
      where: { id: invitationId },
      relations: ['event'],
    });
    if (!invitation) {
      throw new NotFoundException({
        code: RC.NOT_FOUND,
        message: 'Davet bulunamadı',
      });
    }

    if (invitation.inviteeId !== inviteeId) {
      throw new ForbiddenException({
        code: RC.FORBIDDEN,
        message: 'Bu davet size ait değil',
      });
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Sadece beklemedeki davetler reddedilebilir',
      });
    }

    invitation.status = InvitationStatus.REJECTED;
    const saved = await this.auctionRepo.manager.save(AuctionEventInvitation, invitation);

    if (invitation.event?.ownerId) {
      await this.notificationService?.createFromEvent({
        eventId: `auction-invitation-rejected:${saved.id}`,
        userId: invitation.event.ownerId,
        eventType: NotificationEventType.AUCTION_STARTED,
        title: 'Davet reddedildi',
        body: `"${invitation.event.title}" müzayedenize gönderdiğiniz bir davet reddedildi.`,
        relatedEntityType: 'auction_event',
        relatedEntityId: invitation.eventId,
      });
    }

    return {
      code: RC.SUCCESS,
      message: 'Davet reddedildi',
      invitation: saved,
    };
  }

  async getInvitations(inviteeId: string) {
    const invitations = await this.auctionRepo.manager.find(AuctionEventInvitation, {
      where: { inviteeId },
      relations: ['event'],
    });

    return {
      code: RC.SUCCESS,
      message: 'Davetler getirildi',
      invitations,
    };
  }
}

