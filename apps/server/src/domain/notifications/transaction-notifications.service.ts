import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { TransactionRepository } from 'src/database/repositories/transaction.repository';
import { UsersService } from 'src/users/users.service';
import { BotService } from 'src/bot/bot.service';
import { NotificationsService } from './notifications.service';
import { Messages } from 'src/bot/constants/messages.constant';
import { NotificationStatus, NotificationType } from 'src/database/schemas/notification.schema';
import { StatusNotifyUserAboutTransactions } from 'src/integrations/slash/constants/sync.constants';
import { SlashApiService } from 'src/integrations/slash/services/slash-api.service';
import { CardDto } from 'src/integrations/slash/types';
import { Keyboards } from 'src/bot/constants/keyboards.constant';

@Injectable()
export class TransactionNotificationsService {
  private readonly logger = new Logger(TransactionNotificationsService.name);

  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => BotService))
    private readonly botService: BotService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => SlashApiService))
    private readonly slashApiService: SlashApiService,
  ) { }

  async checkAndNotifyNewTransactions(): Promise<void> {
    this.logger.log('Scanning database for new transactions to notify...');

    const lookbackSeconds = 30;
    const lookbackDate = new Date(Date.now() - lookbackSeconds * 1000);

    const recentTransactions = await this.transactionRepository.find({
      startDate: lookbackDate,
      detailedStatus: { $in: StatusNotifyUserAboutTransactions },
      amountCents: { $lt: 0 },
      limit: 100,
    });

    this.logger.log(`Found ${recentTransactions.length} recent transactions to check`);

    for (const transaction of recentTransactions) {
      await this.notifyUserAboutTransaction(transaction);
    }
  }

  private async notifyUserAboutTransaction(transaction: any): Promise<void> {
    this.logger.log(`Processing notification for transaction: ${transaction.slashId}`);

    const user = await this.usersService.findByVirtualAccountId(transaction.virtualAccountId || '');
    if (!user || !user.telegramId) {
      this.logger.warn(
        `User not found for virtual account ID: ${transaction.virtualAccountId}`,
      );
      return;
    }

    const isNotificationSent = await this.notificationsService.isTransactionNotificationSent(
      user.id,
      transaction.slashId,
    );
    if (isNotificationSent) {
      this.logger.debug(
        `Notification already sent for transaction: ${transaction.slashId} with user: ${user.id}`,
      );
      return;
    }

    const destinations = user.notificationChatIds;
    if (destinations.length === 0) {
      this.logger.debug(`No notification destinations configured for user: ${user.id}`);
      return;
    }

    let card: CardDto | undefined;
    if (transaction.cardId) {
      try {
        const cardData = await this.slashApiService.getCard(transaction.cardId, false, false);
        card = cardData;
      } catch (error) {
        this.logger.warn(`Failed to fetch card data for ${transaction.cardId}:`, error);
      }
    }

    const transactionDto = {
      id: transaction.slashId,
      virtualAccountId: transaction.virtualAccountId,
      cardId: transaction.cardId,
      amountCents: transaction.amountCents,
      currency: transaction.currency,
      originalCurrency: transaction.originalCurrency,
      description: transaction.description,
      status: transaction.status,
      detailedStatus: transaction.detailedStatus,
      type: transaction.type,
      date: transaction.date,
      merchantData: transaction.merchantData,
      declineReason: transaction.metadata?.declineReason,
    };

    const notification = Messages.transactionCreated(transactionDto, card);
    await this.botService.sendMessageToMultiple(
      destinations,
      notification.text,
      {
        parse_mode: notification.parse_mode,
        ...(transaction.amountCents === -100
          ? { ...Keyboards.getConfirmCode(transaction.slashId) }
          : {}),
      },
    );

    await this.notificationsService.createNotification({
      userId: user.id,
      type: NotificationType.TRANSACTION,
      status: NotificationStatus.SENT,
      data: {
        transactionId: transaction.slashId,
      },
    });

    this.logger.log(`Notification sent for transaction: ${transaction.slashId}`);
  }
}
