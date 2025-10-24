import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import {
  WebhookEventDto,
  AuthorizationWebhookPayload,
  AuthorizationWebhookResponse,
  TransactionDataDTO,
  WebhookEventType,
} from '../dto/webhook.dto';
import { BotService } from '../../../bot/bot.service';
import { UsersService } from '../../../users/users.service';
import { Messages } from '../../../bot/constants/messages.constant';
import { SlashSyncService } from '../services/slash-sync.service';
import { SlashApiService } from '../services/slash-api.service';
import { CardDto, TransactionDetailedStatus, TransactionDto } from '../types';

/**
 * Slash Webhook Controller
 * Handles incoming webhooks from Slash API
 */
@Controller('slash/webhooks')
export class SlashWebhookController {
  private readonly logger = new Logger(SlashWebhookController.name);
  private readonly webhookSecret: string;
  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly botService: BotService,
    private readonly slashSyncService: SlashSyncService,
    private readonly slashApiService: SlashApiService,
  ) {
    this.webhookSecret = this.configService.get<string>(
      'slash.webhookSecret',
      '',
    );
  }

  /**
   * Verify webhook signature from Slash using RSA public key
   * Used for standard event webhooks (/events endpoint)
   */
  private verifyEventWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    try {
      const result = crypto.verify(
        'sha256',
        Buffer.from(payload),
        this.webhookSecret,
        Buffer.from(signature, 'base64')
      );
      return result;
    } catch (error) {
      this.logger.error('Error verifying event webhook signature', error);
      return false;
    }
  }

  /**
   * Verify authorization webhook signature using HMAC SHA256
   * Used for authorization webhooks (/authorization endpoint)
   */
  private verifyAuthorizationWebhookSignature(
    webhookId: string,
    timestamp: string,
    signature: string,
    body: string
  ): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping signature verification');
      return true;
    }

    try {
      // Remove whsec_ prefix and base64 decode the secret
      const secretBase64 = this.webhookSecret.replace('whsec_', '');
      const decodedSecret = Buffer.from(secretBase64, 'base64');

      // Create payload: webhookId.timestamp.body
      const payload = `${webhookId}.${timestamp}.${body}`;

      // Generate HMAC SHA256 signature
      const expectedSignature = crypto
        .createHmac('sha256', decodedSecret)
        .update(payload)
        .digest('base64');

      // Extract signature (remove v1= prefix if present)
      const receivedSignature = signature.replace('v1=', '');

      // Timing-safe comparison
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'base64'),
        Buffer.from(receivedSignature, 'base64')
      );
    } catch (error) {
      this.logger.error('Error verifying authorization webhook signature', error);
      return false;
    }
  }

  /**
   * Verify webhook timestamp to prevent replay attacks
   */
  private verifyTimestamp(timestamp: string, toleranceSeconds: number = 300): boolean {
    const webhookTime = parseInt(timestamp, 10);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(currentTime - webhookTime);

    return timeDiff <= toleranceSeconds;
  }

  /**
   * Generic webhook endpoint for all Slash events
   * Uses RSA signature verification with Slash's public key
   */
  @Post('events')
  @HttpCode(HttpStatus.OK)
  async handleWebhookEvent(
    @Body() payload: WebhookEventDto,
    @Headers('slash-webhook-signature') signature: string,
  ): Promise<void> {
    this.logger.log(`Received webhook event: ${payload.event}`);

    // Verify RSA signature using Slash's public key
    const payloadString = JSON.stringify(payload);

    if (!signature) {
      throw new BadRequestException('Missing slash-webhook-signature header');
    }

    if (!this.verifyEventWebhookSignature(payloadString, signature)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    try {
      await this.processWebhookEvent(payload);
    } catch (error) {
      this.logger.error(`Error processing webhook event: ${payload.event}`, error);
      throw error;
    }
  }

  /**
   * Authorization webhook endpoint for real-time transaction approval
   */
  @Post('authorization')
  @HttpCode(HttpStatus.OK)
  async handleAuthorizationWebhook(
    @Body() payload: AuthorizationWebhookPayload,
    @Headers('x-slash-signature') signature: string,
    @Headers('x-slash-timestamp') timestamp: string,
  ): Promise<AuthorizationWebhookResponse> {
    this.logger.log(`Received authorization request for card: ${payload.cardId}`);

    // Verify signature if secret is configured
    if (this.webhookSecret) {
      const payloadString = JSON.stringify(payload);

      if (!signature || !timestamp) {
        throw new BadRequestException('Missing signature or timestamp headers');
      }

      if (!this.verifyTimestamp(timestamp)) {
        throw new BadRequestException('Webhook timestamp is too old');
      }

      // TODO: Update to use verifyAuthorizationWebhookSignature with webhookId
      // For now, using basic verification
      this.logger.warn('Authorization webhook signature verification not fully implemented');
      // if (!this.verifyAuthorizationWebhookSignature(webhookId, timestamp, signature, payloadString)) {
      //   throw new BadRequestException('Invalid webhook signature');
      // }
    }

    // Implement your authorization logic here
    const approved = await this.processAuthorizationRequest(payload);

    return {
      approved,
      reason: approved ? undefined : 'Transaction declined by custom logic',
    };
  }

  /**
   * Process webhook events based on type
   */
  private async processWebhookEvent(payload: WebhookEventDto): Promise<void> {
    switch (payload.event) {
      case WebhookEventType.CARD_CREATED:
        await this.handleCardCreated(payload);
        break;
      case WebhookEventType.CARD_UPDATED:
        await this.handleCardUpdated(payload);
        break;
      case WebhookEventType.CARD_CLOSED:
        await this.handleCardClosed(payload);
        break;
      case WebhookEventType.TRANSACTION_CREATED:
        await this.handleTransactionCreated(payload);
        break;
      case WebhookEventType.TRANSACTION_UPDATED:
        await this.handleTransactionUpdated(payload);
        break;
      default:
        this.logger.warn(`Unhandled webhook event type: ${payload.event}`);
    }
  }

  /**
   * Process authorization requests
   * Override this method with your custom authorization logic
   */
  private async processAuthorizationRequest(
    payload: AuthorizationWebhookPayload,
  ): Promise<boolean> {
    // TODO: Implement your authorization logic here
    // Examples:
    // - Check spending limits
    // - Verify merchant categories
    // - Check user balance
    // - Apply custom rules

    this.logger.log(`Processing authorization for amount: ${payload.amount} ${payload.currency}`);

    // Default: approve all transactions
    // Replace with your actual logic
    return true;
  }

  // Event handlers - implement your business logic here

  private async handleCardCreated(event: WebhookEventDto): Promise<void> {
    this.logger.log(`Card created: ${event.entityId}`);

    try {
      const cardData = await this.slashApiService.getCard(event.entityId);
      await this.slashSyncService.syncCardFromWebhook(cardData);
    } catch (error) {
      this.logger.error(`Error handling card created event for ${event.entityId}:`, error);
    }
  }

  private async handleCardUpdated(event: WebhookEventDto): Promise<void> {
    this.logger.log(`Card updated: ${event.entityId}`);

    try {
      const cardData = await this.slashApiService.getCard(event.entityId);
      await this.slashSyncService.syncCardFromWebhook(cardData);
    } catch (error) {
      this.logger.error(`Error handling card updated event for ${event.entityId}:`, error);
    }
  }

  private async handleCardClosed(event: WebhookEventDto): Promise<void> {
    this.logger.log(`Card closed: ${event.entityId}`);

    try {
      const cardData = await this.slashApiService.getCard(event.entityId);
      await this.slashSyncService.syncCardFromWebhook(cardData);
    } catch (error) {
      this.logger.error(`Error handling card closed event for ${event.entityId}:`, error);
    }
  }

  private async handleTransactionCreated(
    event: WebhookEventDto,
  ): Promise<void> {
    this.logger.log(`Transaction created: ${event.entityId}`);

    try {
      const transactionData = await this.slashApiService.getTransaction(event.entityId);
      await this.slashSyncService.syncTransactionFromWebhook(transactionData);

      if (transactionData.amountCents < 0 && (transactionData.detailedStatus === TransactionDetailedStatus.SETTLED || 
        transactionData.detailedStatus === TransactionDetailedStatus.PENDING ||
        transactionData.detailedStatus === TransactionDetailedStatus.DECLINED)) {
        await this.notifyUserAboutTransaction(transactionData);
      }
    } catch (error) {
      this.logger.error(`Error handling transaction created event for ${event.entityId}:`, error);
    }
  }

  private async handleTransactionUpdated(
    event: WebhookEventDto,
  ): Promise<void> {
    this.logger.log(`Transaction updated: ${event.entityId}`);

    try {
      const transactionData = await this.slashApiService.getTransaction(event.entityId);
      await this.slashSyncService.syncTransactionFromWebhook(transactionData);

      if (transactionData.amountCents < 0 && (transactionData.detailedStatus === TransactionDetailedStatus.SETTLED || 
        transactionData.detailedStatus === TransactionDetailedStatus.PENDING ||
        transactionData.detailedStatus === TransactionDetailedStatus.DECLINED)) {
        await this.notifyUserAboutTransaction(transactionData);
      }
    } catch (error) {
      this.logger.error(`Error handling transaction updated event for ${event.entityId}:`, error);
    }
  }

  private async notifyUserAboutTransaction(transactionData: TransactionDto): Promise<void> {
    this.logger.log(`Notifying user about transaction: ${transactionData.id}`);
    const user = await this.usersService.findByVirtualAccountId(transactionData.virtualAccountId || '');
    if (!user || !user.telegramId) {
      this.logger.warn(
        `User not found for virtual account ID: ${transactionData.virtualAccountId}`,
      );
      return;
    }

    const destinations = user.notificationChatIds;
    if (destinations.length > 0) {

      let card: CardDto | undefined;
      if (transactionData.cardId) {
        try {
          const cardData = await this.slashApiService.getCard(transactionData.cardId, false, false);
          card = cardData;
        } catch (error) {
          this.logger.warn(`Failed to fetch card data for ${transactionData.cardId}:`, error);
        }
      }

      await this.botService.sendMessageToMultiple(
        destinations,
        Messages.transactionCreated(transactionData, card),
      );
    }
  }
}
