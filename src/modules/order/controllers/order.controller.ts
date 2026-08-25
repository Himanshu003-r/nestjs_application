import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { OrderService } from '../service/order.service';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { PaginationQueryDto } from 'src/common/dto/pagination-query.dto';

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUser() user: JwtPayload) {
    return this.orderService.createOrder(user.sub);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  get(@CurrentUser() user:JwtPayload, @Query() paginationQuery: PaginationQueryDto){
    return this.orderService.getOrders(user.sub, paginationQuery)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getOne(@CurrentUser() user:JwtPayload, @Param('id') orderId: string){
   return this.orderService.getOrderById(user.sub, orderId)
  }
}
