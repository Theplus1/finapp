import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from '../schemas/notification.schema';
import { RepositoryQuery } from '../../common/types/repository-query.types';

@Injectable()
export class NotificationRepository {
  private readonly logger = new Logger(NotificationRepository.name);

  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
  ) { }

  async create(notificationData: Partial<Notification>): Promise<NotificationDocument> {
    const notification = new this.notificationModel(notificationData);
    return notification.save();
  }

  async upsert(id: string, notificationData: Partial<Notification>): Promise<NotificationDocument> {
    return this.notificationModel.findOneAndUpdate(
      { _id: id },
      {
        ...notificationData,
      },
      { upsert: true, new: true },
    ).exec();
  }

  async find(query: RepositoryQuery): Promise<NotificationDocument[]> {
    let queryBuilder = this.notificationModel
      .find(query.filter)
      .sort(query.sort || { createdAt: -1 });
    
    if (query.skip) {
      queryBuilder = queryBuilder.skip(query.skip);
    }
    if (query.limit) {
      queryBuilder = queryBuilder.limit(query.limit);
    }

    return queryBuilder.exec();
  }

  async softDelete(id: string): Promise<void> {
    await this.notificationModel.updateOne(
      { _id: id },
      { isDeleted: true },
    ).exec();
  }
}
