import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNotificationDto } from '../dto/create-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly prismaService: PrismaService) {}

  async createNotification(
    userId: string,
    createNotificationDto: CreateNotificationDto,
  ) {
    const createNotification = await this.prismaService.notification.create({
      data: {
        userId,
        ...createNotificationDto,
      },
    });

    return {
      data: createNotification,
      message: 'Message created successfully',
    };
  }

  async getUserNotification(userId: string) {
    const getNotifications = await this.prismaService.notification.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: getNotifications,
      message: 'Notifications fetched successfully',
    };
  }
}
