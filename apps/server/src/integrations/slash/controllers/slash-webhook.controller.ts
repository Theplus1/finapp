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
   * Verify webhook signature from Slash
   */
  private verifyWebhookSignature(
    payload: string,
    signature: string
  ): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping signature verification');
      return true;
    }

    try {
      const result = crypto.verify(
        'sha256',
        Buffer.from(payload),
        this.webhookSecret,
        Buffer.from(signature, 'base64')
      );
      return result;
    } catch (error) {
      this.logger.error('Error verifying webhook signature', error);
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
   */
  @Post('events')
  @HttpCode(HttpStatus.OK)
  async handleWebhookEvent(
    @Body() payload: WebhookEventDto,
    @Headers('x-slash-signature') signature: string,
    @Headers('x-slash-timestamp') timestamp: string,
  ): Promise<void> {
    this.logger.log(`Received webhook event: ${payload.type}`);

    // Verify signature if secret is configured
    if (this.webhookSecret) {
      const payloadString = JSON.stringify(payload);
      
      if (!signature || !timestamp) {
        throw new BadRequestException('Missing signature or timestamp headers');
      }

      if (!this.verifyTimestamp(timestamp)) {
        throw new BadRequestException('Webhook timestamp is too old');
      }

      if (!this.verifyWebhookSignature(payloadString, signature)) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    // Handle different event types
    try {
      await this.processWebhookEvent(payload);
    } catch (error) {
      this.logger.error(`Error processing webhook event: ${payload.type}`, error);
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

      if (!this.verifyWebhookSignature(payloadString, signature)) {
        throw new BadRequestException('Invalid webhook signature');
      }
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
  private async processWebhookEvent(event: WebhookEventDto): Promise<void> {
    switch (event.type) {
      case WebhookEventType.CARD_CREATED:
        await this.handleCardCreated(event);
        break;
      case WebhookEventType.CARD_UPDATED:
        await this.handleCardUpdated(event);
        break;
      case WebhookEventType.CARD_CLOSED:
        await this.handleCardClosed(event);
        break;
      case WebhookEventType.TRANSACTION_CREATED:
        await this.handleTransactionCreated(event);
        break;
      case WebhookEventType.TRANSACTION_UPDATED:
        await this.handleTransactionUpdated(event);
        break;
      default:
        this.logger.warn(`Unhandled webhook event type: ${event.type}`);
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
      // Fetch full card details from Slash API
      const cardData = await this.slashApiService.getCard(event.entityId);
      
      // Sync to local database
      await this.slashSyncService.syncCardFromWebhook(cardData);
    } catch (error) {
      this.logger.error(`Error handling card created event for ${event.entityId}:`, error);
    }
  }

  private async handleCardUpdated(event: WebhookEventDto): Promise<void> {
    this.logger.log(`Card updated: ${event.entityId}`);
    
    try {
      // Fetch full card details from Slash API
      const cardData = await this.slashApiService.getCard(event.entityId);
      
      // Sync to local database
      await this.slashSyncService.syncCardFromWebhook(cardData);
    } catch (error) {
      this.logger.error(`Error handling card updated event for ${event.entityId}:`, error);
    }
  }

  private async handleCardClosed(event: WebhookEventDto): Promise<void> {
    this.logger.log(`Card closed: ${event.entityId}`);
    
    try {
      // Fetch full card details from Slash API
      const cardData = await this.slashApiService.getCard(event.entityId);
      
      // Sync to local database
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
      // Fetch full transaction details from Slash API
      const transactionData = await this.slashApiService.getTransaction(event.entityId);
      
      // Sync to local database
      await this.slashSyncService.syncTransactionFromWebhook(transactionData);
      
      // Send notification to user
      const data = event.data as TransactionDataDTO;
      const user = await this.usersService.findByVirtualAccountId(data.virtualAccountId || '');
      if (!user) {
        this.logger.warn(
          `User not found for virtual account ID: ${data.virtualAccountId}`,
        );
        return;
      }
      if (!user.telegramId) {
        this.logger.warn(`User ${user.id} does not have a Telegram ID`);
        return;
      }
        // Send to notification destinations (groups/channels only)
        const destinations = user.notificationChatIds;
        if (destinations.length > 0) {
          await this.botService.sendMessageToMultiple(
            destinations,
            Messages.transactionCreated(data),
          );
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
      // Fetch full transaction details from Slash API
      const transactionData = await this.slashApiService.getTransaction(event.entityId);
      
      // Sync to local database
      await this.slashSyncService.syncTransactionFromWebhook(transactionData);
      
      // Send notification to user
      const data = event.data as TransactionDataDTO;
      const user = await this.usersService.findByVirtualAccountId(data.virtualAccountId || '');
      if (!user) {
        this.logger.warn(
          `User not found for virtual account ID: ${data.virtualAccountId}`,
        );
        return;
      }
      if (!user.telegramId) {
        this.logger.warn(`User ${user.id} does not have a Telegram ID`);
        return;
      }
      // Send to notification destinations (groups/channels only)
      const destinations = await this.usersService.getNotificationDestinations(user.telegramId);
      if (destinations.length > 0) {
        await this.botService.sendMessageToMultiple(
          destinations,
          Messages.transactionUpdated(data),
        );
      }
    } catch (error) {
      this.logger.error(`Error handling transaction updated event for ${event.entityId}:`, error);
    }
  }
}
