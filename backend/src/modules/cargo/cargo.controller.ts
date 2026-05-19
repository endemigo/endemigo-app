import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CargoService } from './cargo.service';

@ApiTags('Cargo')
@ApiBearerAuth()
@Controller('cargo')
export class CargoController {
  constructor(private readonly cargoService: CargoService) {}

  @Post('orders/:orderId/shipments')
  @Roles('seller', 'admin')
  @ApiOperation({ summary: 'Create mock shipment for order' })
  createShipmentForOrder(
    @CurrentUser() user: { id: string; isAdmin?: boolean },
    @Param('orderId') orderId: string,
  ) {
    return this.cargoService.createShipmentForOrderForUser(orderId, user);
  }

  @Post('orders/:orderId/return-shipment')
  @Roles('seller', 'admin')
  @ApiOperation({ summary: 'Create return shipment for order' })
  createReturnShipmentForOrder(
    @CurrentUser() user: { id: string; isAdmin?: boolean },
    @Param('orderId') orderId: string,
  ) {
    return this.cargoService.createReturnShipmentForOrderForUser(orderId, user);
  }

  @Get('orders/:orderId/shipments')
  @ApiOperation({ summary: 'Get order shipments' })
  getOrderShipments(
    @CurrentUser() user: { id: string; isAdmin?: boolean },
    @Param('orderId') orderId: string,
  ) {
    return this.cargoService.getOrderShipmentsForUser(orderId, user);
  }

  @Get('orders/:orderId/shipment')
  @ApiOperation({ summary: 'Get order shipment' })
  getShipmentForOrder(
    @CurrentUser() user: { id: string; isAdmin?: boolean },
    @Param('orderId') orderId: string,
  ) {
    return this.cargoService.getShipmentForOrderForUser(orderId, user);
  }

  @Get('shipments/:shipmentId/events')
  @ApiOperation({ summary: 'Get shipment events' })
  getShipmentEvents(
    @CurrentUser() user: { id: string; isAdmin?: boolean },
    @Param('shipmentId') shipmentId: string,
  ) {
    return this.cargoService.getShipmentEventsForUser(shipmentId, user);
  }
}
