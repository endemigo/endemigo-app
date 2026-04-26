import { Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CargoService } from './cargo.service';

@ApiTags('Cargo')
@ApiBearerAuth()
@Controller('cargo')
export class CargoController {
  constructor(private readonly cargoService: CargoService) {}

  @Post('orders/:orderId/shipments')
  @ApiOperation({ summary: 'Create mock shipment for order' })
  createShipmentForOrder(@Param('orderId') orderId: string) {
    return this.cargoService.createShipmentForOrder(orderId);
  }

  @Get('orders/:orderId/shipment')
  @ApiOperation({ summary: 'Get order shipment' })
  getShipmentForOrder(@Param('orderId') orderId: string) {
    return this.cargoService.getShipmentForOrder(orderId);
  }
}
