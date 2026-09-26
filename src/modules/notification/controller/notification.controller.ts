import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { NotificationService } from '../service/notification.service';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorator/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';
import { CreateNotificationDto } from '../dto/create-notification.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('/')
  @UseGuards(JwtAuthGuard)
  createNotification(
    @CurrentUser() user: JwtPayload,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    return this.notificationService.createNotification(
      user.sub,
      createNotificationDto,
    );
  }

  @Get('myNotifications')
  @UseGuards(JwtAuthGuard)
  getNotifications(@CurrentUser() user: JwtPayload) {
    return this.notificationService.getUserNotification(user.sub);
  }
}
