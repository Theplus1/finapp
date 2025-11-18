import { IsEnum, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';
import { NotificationStatus, NotificationType } from 'src/database/schemas/notification.schema';

export class CreateNotificationDto {
  type: NotificationType;
  status: NotificationStatus;
  userId: string;
  data: Record<string, any>;
}
