import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  BadRequestException,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuctionService } from './auction.service';
import { CreateAuctionDto, UpdateAuctionDto, PlaceBidDto, RegisterToAuctionDto } from './dto/auction.dto';
import { AuctionType } from '../../shared/types/auction-type.enum';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RC, AuctionEventStatus, AuctionRegistrationStatus, AuctionEventSystemType, JointManagementType, AuctionApprovalStatus } from '@endemigo/shared';


function parsePositiveIntQuery(
  value: unknown,
  field: string,
  defaultValue: number,
  maxValue?: number,
): number {
  const rawValue = value ?? defaultValue;
  const parsed =
    typeof rawValue === 'number' ? rawValue : Number(String(rawValue));

  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException({
      code: RC.VALIDATION_ERROR,
      message: `${field} must be a positive integer`,
    });
  }

  return maxValue ? Math.min(parsed, maxValue) : parsed;
}

@ApiTags('Auctions')
@Controller('auctions')
export class AuctionController {
  constructor(private readonly auctionService: AuctionService) {}

  @Post()
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Müzayede oluştur (DRAFT — sadece satıcılar)' })
  @ApiResponse({ status: 201, description: 'Müzayede taslağı oluşturuldu' })
  @ApiResponse({ status: 403, description: 'Sadece satıcılar' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAuctionDto,
  ) {
    return this.auctionService.create(userId, dto);
  }

  @Post('events/:eventId/apply')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Müzayede etkinliğine ürün başvurusu yap (sadece satıcılar)' })
  @ApiResponse({ status: 201, description: 'Müzayede etkinliği başvurusu alındı' })
  async applyToEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAuctionDto,
  ) {
    return this.auctionService.applyToEvent(userId, eventId, dto);
  }

  @Patch(':id/publish')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Müzayedeyi yayınla (DRAFT → PUBLISHED)' })
  @ApiResponse({ status: 200, description: 'Müzayede yayınlandı' })
  @ApiResponse({ status: 400, description: 'Sadece taslak yayınlanabilir' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.auctionService.publishAuction(id, userId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Taslak müzayedeyi düzenle' })
  @ApiResponse({ status: 200, description: 'Güncellendi' })
  @ApiResponse({ status: 400, description: 'Sadece taslak düzenlenebilir' })
  async updateDraft(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAuctionDto,
  ) {
    return this.auctionService.updateDraft(id, userId, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({
    summary: 'Müzayede iptal (teklif yoksa satıcı, varsa admin)',
  })
  @ApiResponse({ status: 200, description: 'Müzayede iptal edildi' })
  @ApiResponse({ status: 400, description: 'Teklif varsa iptal edilemez' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.auctionService.cancelAuction(id, userId);
  }

  @Public()
  @Get('events')
  @ApiOperation({ summary: 'Müzayede etkinlikleri listesi' })
  @ApiQuery({ name: 'status', required: false, enum: AuctionEventStatus })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findEvents(
    @Query('status') status?: AuctionEventStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const safePage = parsePositiveIntQuery(page, 'page', 1);
    const safeLimit = parsePositiveIntQuery(limit, 'limit', 20, 50);
    return this.auctionService.findEvents(status, safePage, safeLimit);
  }

  @Public()
  @Get('events/:id')
  @ApiOperation({ summary: 'Müzayede etkinlik detayları' })
  async findEventDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.auctionService.findEventDetails(id);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Müzayede listesi' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'auctionType', required: false, enum: ['REALTIME', 'TIMED'] })
  @ApiQuery({ name: 'productId', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('auctionType') auctionType?: string,
    @Query('productId') productId?: string,
  ) {
    const safePage = parsePositiveIntQuery(page, 'page', 1);
    const safeLimit = parsePositiveIntQuery(limit, 'limit', 20, 50);
    if (
      auctionType &&
      !Object.values(AuctionType).includes(auctionType as AuctionType)
    ) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'auctionType must be a valid AuctionType',
      });
    }
    const validType = auctionType as AuctionType | undefined;
    return this.auctionService.findAll(safePage, safeLimit, validType, productId);
  }

  // Statik path'ler ':id'den ÖNCE tanımlanmalı; aksi halde ParseUUIDPipe
  // '/auctions/invitations' isteğini 400 ile keser.
  @Get('invitations')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Gelen ortak müzayede davetlerini listele' })
  async getInvitations(@CurrentUser('id') userId: string) {
    return this.auctionService.getInvitations(userId);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Müzayede detay' })
  @ApiResponse({ status: 200, description: 'Müzayede bilgileri' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.auctionService.findById(id);
  }

  @Post(':id/bids')
  @ApiBearerAuth()
  // WR-01: Tighter rate limit — reduces pessimistic lock contention under high concurrency
  @Throttle({ default: { limit: 2, ttl: 5000 } })
  @ApiOperation({ summary: 'Teklif ver' })
  @ApiResponse({ status: 201, description: 'Teklif kabul edildi' })
  @ApiResponse({ status: 400, description: 'Validation hatası' })
  async placeBid(
    @Param('id', ParseUUIDPipe) auctionId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: PlaceBidDto,
  ) {
    return this.auctionService.placeBid(auctionId, userId, dto);
  }

  @Delete(':id/bids/me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aktif lider teklifini geri cek' })
  @ApiResponse({ status: 200, description: 'Teklif geri cekildi' })
  async withdrawBid(
    @Param('id', ParseUUIDPipe) auctionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.auctionService.withdrawBid(auctionId, userId);
  }

  @Post(':id/register')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Müzayedeye katılım başvurusu yap' })
  @ApiResponse({ status: 201, description: 'Başvuru alındı veya zaten var' })
  async registerToAuction(
    @Param('id', ParseUUIDPipe) auctionId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterToAuctionDto,
  ) {
    return this.auctionService.registerToAuction(userId, auctionId, dto);
  }

  @Get(':id/registration-status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kullanıcının müzayede katılım durumunu sorgula' })
  async getRegistrationStatus(
    @Param('id', ParseUUIDPipe) auctionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.auctionService.getRegistrationStatus(userId, auctionId);
  }

  @Public()
  @Get(':id/bids')
  @ApiOperation({ summary: 'Teklif geçmişi (D-15: tam şeffaflık)' })
  async getBids(@Param('id', ParseUUIDPipe) auctionId: string) {
    return this.auctionService.getBids(auctionId);
  }

  @Public()
  @Get(':id/result')
  @ApiOperation({ summary: 'Müzayede sonucu' })
  async getResult(@Param('id', ParseUUIDPipe) auctionId: string) {
    return this.auctionService.getResult(auctionId);
  }

  @Post(':id/complete-payment')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Kazanan odemesini tamamla' })
  async completeWinnerPayment(
    @Param('id', ParseUUIDPipe) auctionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.auctionService.completeWinnerPayment(auctionId, userId);
  }

  @Public()
  @Get(':id/ics')
  @ApiOperation({ summary: 'Müzayede takvim dosyası (.ics) indir' })
  async getIcs(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const icsContent = await this.auctionService.getIcsContent(id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="auction-${id}.ics"`);
    return res.send(icsContent);
  }

  @Post('pre-contract/accept')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Müzayede ön sözleşmesini kabul et' })
  async acceptPreContract(
    @CurrentUser('id') userId: string,
    @Body('eventType') eventType: 'INDEPENDENT' | 'JOINT',
  ) {
    if (!['INDEPENDENT', 'JOINT'].includes(eventType)) {
      throw new BadRequestException({
        code: RC.VALIDATION_ERROR,
        message: 'Geçersiz eventType. INDEPENDENT veya JOINT olmalıdır.',
      });
    }
    return this.auctionService.acceptPreContract(userId, eventType);
  }

  @Post('events')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Müzayede etkinliği oluştur (Model 1 veya Model 2)' })
  async createEvent(
    @CurrentUser('id') userId: string,
    @Body() dto: {
      title: string;
      description?: string;
      coverImageUrl?: string;
      categoryId?: string;
      auctionType?: AuctionType;
      currency?: string;
      startTime: string;
      endTime: string;
      submissionDeadline?: string;
      eventType: AuctionEventSystemType;
      jointManagementType?: JointManagementType;
      minProductsCount?: number;
      maxProductsCount?: number;
    },
  ) {
    return this.auctionService.createEvent(userId, dto);
  }

  @Post('events/:eventId/submit')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Müzayede etkinliğini onaya sun' })
  async submitEventForApproval(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.auctionService.submitEventForApproval(eventId, userId);
  }

  @Post('events/:eventId/lots/bulk')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Excel toplu lot yükleme — ürün + lot tek adımda (satır bazlı hata raporu)' })
  async bulkImportLots(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { guaranteeAccepted?: boolean; lots: Record<string, unknown>[] },
  ) {
    return this.auctionService.bulkImportLots(userId, eventId, dto);
  }

  @Patch('events/:eventId/open-call')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Ortak müzayedede açık ürün çağrısını aç/kapat (sadece organizatör)' })
  async setOpenCall(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser('id') userId: string,
    @Body('enabled') enabled: boolean,
  ) {
    return this.auctionService.setOpenCall(eventId, userId, Boolean(enabled));
  }

  @Patch('events/:eventId/lots/:lotId/approve')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Ortak müzayede lotunu onayla/reddet (sadece organizatör)' })
  async organizerApproveLot(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Param('lotId', ParseUUIDPipe) lotId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { status: AuctionApprovalStatus; reason?: string },
  ) {
    return this.auctionService.organizerApproveLot(
      eventId,
      lotId,
      userId,
      dto.status,
      dto.reason,
    );
  }

  @Post('events/:eventId/invite')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Ortak müzayedeye tedarikçi davet et (ID veya e-posta ile)' })
  async inviteToEvent(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: { inviteeId?: string; email?: string },
  ) {
    return this.auctionService.sendInvitation(eventId, userId, dto.inviteeId, dto.email);
  }

  @Post('invitations/:invitationId/cancel')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Bekleyen daveti geri çek (sadece etkinlik sahibi)' })
  async cancelInvitation(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.auctionService.cancelInvitation(invitationId, userId);
  }

  @Post('invitations/:invitationId/accept')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Ortak müzayede davetini kabul et' })
  async acceptInvitation(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.auctionService.acceptInvitation(invitationId, userId);
  }

  @Post('invitations/:invitationId/reject')
  @ApiBearerAuth()
  @Roles('seller')
  @ApiOperation({ summary: 'Ortak müzayede davetini reddet' })
  async rejectInvitation(
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.auctionService.rejectInvitation(invitationId, userId);
  }
}

