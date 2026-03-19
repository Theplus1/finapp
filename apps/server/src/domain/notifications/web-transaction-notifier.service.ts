import { Injectable, Logger } from '@nestjs/common';
import type { CardDto } from 'src/integrations/slash/types';
import {
  AdsTransactionsGateway,
  FacebookVerifyNotificationPayload,
} from './ads-transactions.gateway';
import { WebNotificationsService } from './web-notifications.service';

export interface TransactionNotificationDto {
  id: string;
  virtualAccountId: string;
  cardId?: string;
  amountCents: number;
  currency: string;
  originalCurrency?: {
    code?: string;
    amountCents?: number;
    conversionRate?: number;
  };
  description?: string;
  status: string;
  detailedStatus: string;
  type: string;
  date: string;
  merchantData?: {
    description?: string;
    name?: string;
    [key: string]: unknown;
  } | null;
  declineReason?: string;
}

@Injectable()
export class WebTransactionNotifier {
  private readonly logger = new Logger(WebTransactionNotifier.name);

  constructor(
    private readonly adsTransactionsGateway: AdsTransactionsGateway,
    private readonly webNotificationsService: WebNotificationsService,
  ) {}

  async notifyFacebookVerify(
    transaction: TransactionNotificationDto,
    card?: CardDto,
  ): Promise<void> {
    // Chỉ xử lý transaction verify Facebook (-$1)
    if (transaction.amountCents !== -100) {
      return;
    }

    const alreadyNotified = await this.webNotificationsService.isFacebookVerifyNotified(
      transaction.virtualAccountId,
      transaction.id,
    );
    if (alreadyNotified) {
      return;
    }

    const payload: FacebookVerifyNotificationPayload = {
      transactionId: transaction.id,
      virtualAccountId: transaction.virtualAccountId,
      amountCents: transaction.amountCents,
      currency: transaction.currency,
      cardId: transaction.cardId,
      cardName: card?.name,
      merchantName: transaction.merchantData?.name,
      description: transaction.merchantData?.description ?? transaction.description,
      createdAt: transaction.date,
    };

    this.logger.log(
      `Sending facebook verify notification for tx=${payload.transactionId} va=${payload.virtualAccountId}`,
    );
    await this.adsTransactionsGateway.notifyFacebookVerify(payload);
    await this.webNotificationsService.markFacebookVerifyNotified({
      virtualAccountId: transaction.virtualAccountId,
      transactionId: transaction.id,
    });
  }
}

