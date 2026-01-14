import { Injectable, Logger } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationRepository } from 'src/database/repositories/notification.repository';
import { NotificationStatus, NotificationType } from 'src/database/schemas/notification.schema';

@Injectable()
export class NotificationsService {

  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
  ) { }

  async createNotification(createNotificationDto: CreateNotificationDto & { userId: string }): Promise<string> {
    const notification = await this.notificationRepository.create({
      ...createNotificationDto,
    });

    return notification.id.toString();
  }

  async isTransactionNotificationSent(userId: string, id: string) {
    const notifications = await this.notificationRepository.find({
      filter: {
        type: NotificationType.TRANSACTION,
        status: NotificationStatus.SENT,
        data: {
          transactionId: id,
        },
        userId,
      },
      limit: 1,
    });
    return notifications.length > 0;
  }

  async isBalanceAlertSent(userId: string, virtualAccountId: string, cooldownHours: number): Promise<boolean> {
    const cooldownDate = new Date();
    cooldownDate.setHours(cooldownDate.getHours() - cooldownHours);

    const notifications = await this.notificationRepository.find({
      filter: {
        type: NotificationType.BALANCE_ALERT,
        status: NotificationStatus.SENT,
        'data.virtualAccountId': virtualAccountId, // Use dot notation for nested field
        userId,
        createdAt: { $gte: cooldownDate },
      },
      limit: 1,
    });
    return notifications.length > 0;
  }
}