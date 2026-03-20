import { Injectable, Logger } from '@nestjs/common';
import { NotificationRepository } from 'src/database/repositories/notification.repository';
import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
} from 'src/database/schemas/notification.schema';
import type { NotificationDocument } from 'src/database/schemas/notification.schema';
import type { FilterQuery, UpdateQuery } from 'mongoose';

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
        'data.action': { $in: ['confirm', 'cancel'] },
      },
      limit: 1,
    });
    return notifications.length > 0;
  }

  async isFacebookVerifyPendingRecent(
    virtualAccountId: string,
    transactionId: string,
    cooldownMs: number,
  ): Promise<boolean> {
    const since = new Date(Date.now() - cooldownMs);
    const notifications = await this.notificationRepository.find({
      filter: {
        channel: NotificationChannel.WEB,
        type: NotificationType.TRANSACTION,
        status: NotificationStatus.PENDING,
        'data.virtualAccountId': virtualAccountId,
        'data.transactionId': transactionId,
        'data.audience': 'ads',
        updatedAt: { $gte: since },
      },
      limit: 1,
    });
    return notifications.length > 0;
  }

  async upsertFacebookVerifyNotifiedPending(params: {
    virtualAccountId: string;
    transactionId: string;
  }): Promise<void> {
    const filter = {
      userId: `va:${params.virtualAccountId}`, // không gắn 1 user cụ thể (vì nhiều NV ads)
      channel: NotificationChannel.WEB,
      type: NotificationType.TRANSACTION,
      'data.virtualAccountId': params.virtualAccountId,
      'data.transactionId': params.transactionId,
      'data.audience': 'ads',
    };

    await this.notificationRepository.upsertByFilter(filter, {
      $set: {
        userId: `va:${params.virtualAccountId}`,
        channel: NotificationChannel.WEB,
        type: NotificationType.TRANSACTION,
        status: NotificationStatus.PENDING,
        data: {
          virtualAccountId: params.virtualAccountId,
          transactionId: params.transactionId,
          audience: 'ads',
        },
      },
    });

    this.logger.log(
      `Web notified (PENDING) for facebook verify tx=${params.transactionId} va=${params.virtualAccountId}`,
    );
  }

  async markFacebookVerifyActionSent(params: {
    virtualAccountId: string;
    transactionId: string;
    action: 'confirm' | 'cancel';
  }): Promise<void> {
    const filter: FilterQuery<NotificationDocument> = {
      userId: `va:${params.virtualAccountId}`,
      channel: NotificationChannel.WEB,
      type: NotificationType.TRANSACTION,
      'data.virtualAccountId': params.virtualAccountId,
      'data.transactionId': params.transactionId,
      'data.audience': 'ads',
    };

    const update: UpdateQuery<NotificationDocument> = {
      $set: {
        status: NotificationStatus.SENT,
        data: {
          virtualAccountId: params.virtualAccountId,
          transactionId: params.transactionId,
          audience: 'ads',
          action: params.action,
        },
      },
    };

    await this.notificationRepository.updateOneByFilter(filter, update);

    this.logger.log(
      `Web notified action=${params.action} => SENT for facebook verify tx=${params.transactionId} va=${params.virtualAccountId}`,
    );
  }
}

