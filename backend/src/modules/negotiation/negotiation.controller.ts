import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@endemigo/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AdminRoles } from '../admin-auth/decorators/admin-roles.decorator';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { AdminViewConversationDto } from './dto/admin-view-conversation.dto';
import { CloseConversationDto } from './dto/close-conversation.dto';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { CreateOfferDto } from './dto/create-offer.dto';
import { ReportConversationDto } from './dto/report-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { NegotiationService } from './negotiation.service';

interface RequestContext {
  ip?: string;
  headers: Record<string, string | string[] | undefined>;
  adminUser?: {
    id: string;
    roles: AdminRole[];
  };
}

@ApiTags('Negotiations')
@ApiBearerAuth()
@Controller('negotiations')
export class NegotiationController {
  constructor(private readonly negotiationService: NegotiationService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateConversationDto,
  ) {
    return this.negotiationService.createConversation(userId, dto);
  }

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.negotiationService.listConversations(userId);
  }

  @Get(':id')
  get(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.negotiationService.getConversation(userId, id);
  }

  @Get(':id/messages')
  messages(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.negotiationService.listMessages(userId, id);
  }

  @Post(':id/messages')
  sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendMessageDto,
    @Request() request: RequestContext,
  ) {
    return this.negotiationService.sendMessage(userId, id, dto, {
      ipAddress: request.ip,
      userAgent: this.headerValue(request.headers['user-agent']),
      deviceId: this.headerValue(request.headers['x-device-id']),
    });
  }

  @Post(':id/offers')
  createOffer(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.negotiationService.createOffer(userId, id, dto);
  }

  @Post(':id/counter-offer')
  counterOffer(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOfferDto,
  ) {
    return this.negotiationService.createOffer(userId, id, dto);
  }

  @Post('offers/:offerId/accept')
  acceptOffer(
    @CurrentUser('id') userId: string,
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ) {
    return this.negotiationService.acceptOffer(userId, offerId);
  }

  @Post('offers/:offerId/reject')
  rejectOffer(
    @CurrentUser('id') userId: string,
    @Param('offerId', ParseUUIDPipe) offerId: string,
  ) {
    return this.negotiationService.rejectOffer(userId, offerId);
  }

  @Post(':id/close')
  close(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseConversationDto = {},
  ) {
    return this.negotiationService.closeConversation(userId, id, dto.reason);
  }

  @Post(':id/report')
  report(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReportConversationDto,
  ) {
    return this.negotiationService.reportConversation(userId, id, dto);
  }

  @Public()
  @UseGuards(AdminJwtGuard)
  @AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS, AdminRole.SUPPORT)
  @Post('admin/:id/view')
  adminView(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminViewConversationDto,
    @Request() request: RequestContext,
  ) {
    return this.negotiationService.adminViewConversation(
      id,
      {
        id: request.adminUser?.id ?? '',
        roles: request.adminUser?.roles ?? [],
      },
      dto.reason,
      {
        ipAddress: request.ip,
        userAgent: this.headerValue(request.headers['user-agent']),
      },
    );
  }

  private headerValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value;
  }
}
