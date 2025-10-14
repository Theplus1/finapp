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
} from './dto/webhook.dto';
import { BotService } from 'src/bot/bot.service';
import { UsersService } from 'src/users/users.service';
import { Messages } from 'src/bot/constants/messages.constant';

@Controller('slash/webhooks')
export class SlashWebhookController {
  private readonly logger = new Logger(SlashWebhookController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
    private readonly botService: BotService,
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
    signature: string,
    timestamp: string,
  ): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping signature verification');
      return true;
    }

    try {
      const signedPayload = `${timestamp}.${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signedPayload)
        .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
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

      if (!this.verifyWebhookSignature(payloadString, signature, timestamp)) {
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

      if (!this.verifyWebhookSignature(payloadString, signature, timestamp)) {
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
      case 'card.created':
        await this.handleCardCreated(event);
        break;
      case 'card.updated':
        await this.handleCardUpdated(event);
        break;
      case 'card.closed':
        await this.handleCardClosed(event);
        break;
      case 'transaction.created':
        await this.handleTransactionCreated(event);
        break;
      case 'transaction.updated':
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
    // TODO: Implement your logic
  }

  private async handleCardUpdated(event: WebhookEventDto): Promise<void> {
    this.logger.log(`Card updated: ${event.entityId}`);
    // TODO: Implement your logic
  }

  private async handleCardClosed(event: WebhookEventDto): Promise<void> {
    this.logger.log(`Card closed: ${event.entityId}`);
    // TODO: Implement your logic
  }

  private async handleTransactionCreated(
    event: WebhookEventDto,
  ): Promise<void> {
    this.logger.log(`Transaction created: ${event.entityId}`);
    const data = event.data as TransactionDataDTO;
    const user = await this.usersService.findByAccountNumber(data.accountId || '');
    if (!user) {
      this.logger.warn(
        `User not found for virtual account ID: ${data.accountId}`,
      );
      return;
    }
    if (!user.telegramId) {
      this.logger.warn(`User ${user.id} does not have a Telegram ID`);
      return;
    }
    if (user.isSubscribed) {
      await this.botService.sendMessage(
        user.telegramId,
        Messages.transactionCreated(data),
      );
    }
  }

  private async handleTransactionUpdated(
    event: WebhookEventDto,
  ): Promise<void> {
    this.logger.log(`Transaction updated: ${event.entityId}`);
    const data = event.data as TransactionDataDTO;
    const user = await this.usersService.findByAccountNumber(data.accountId || '');
    if (!user) {
      this.logger.warn(
        `User not found for virtual account ID: ${data.accountId}`,
      );
      return;
    }
    if (!user.telegramId) {
      this.logger.warn(`User ${user.id} does not have a Telegram ID`);
      return;
    }
    if (user.isSubscribed) {
      await this.botService.sendMessage(
        user.telegramId,
        Messages.transactionUpdated(data),
      );
    }
  }
}
