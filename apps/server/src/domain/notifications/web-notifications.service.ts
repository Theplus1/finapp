import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepository } from 'src/database/repositories/notification.repository';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from 'src/database/schemas/notification.schema';

@Injectable()
export class WebNotificationsService {
  private readonly logger = new Logger(WebNotificationsService.name);

  constructor(private readonly notificationRepository: NotificationRepository) {}

  async isFacebookVerifyNotified(
    virtualAccountId: string,
    transactionId: string,
  ): Promise<boolean> {
    const notifications = await this.notificationRepository.find({
      filter: {
        channel: NotificationChannel.WEB,
        type: NotificationType.TRANSACTION,
        status: NotificationStatus.SENT,
        'data.virtualAccountId': virtualAccountId,
        'data.transactionId': transactionId,
        'data.audience': 'ads',
      },
      limit: 1,
    });
    return notifications.length > 0;
  }

  async markFacebookVerifyNotified(params: {
    virtualAccountId: string;
    transactionId: string;
  }): Promise<void> {
    await this.notificationRepository.create({
      userId: `va:${params.virtualAccountId}`, // không gắn 1 user cụ thể (vì nhiều NV ads)
      channel: NotificationChannel.WEB,
      type: NotificationType.TRANSACTION,
      status: NotificationStatus.SENT,
      data: {
        virtualAccountId: params.virtualAccountId,
        transactionId: params.transactionId,
        audience: 'ads',
      },
    });
    this.logger.log(
      `Web notified for facebook verify tx=${params.transactionId} va=${params.virtualAccountId}`,
    );
  }
}

