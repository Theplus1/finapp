import { Injectable, Logger } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(@InjectBot() private bot: Telegraf) {}

  async sendMessage(chatId: number, message: string, extra?: any) {
    try {
      await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...extra,
      });
      this.logger.log(`Message sent to ${chatId}`);
    } catch (error) {
      this.logger.error(`Failed to send message to ${chatId}:`, error);
    }
  }

  async sendMessageToMultiple(chatIds: number[], message: string) {
    const promises = chatIds.map((chatId) => this.sendMessage(chatId, message));
    await Promise.allSettled(promises);
  }

  getBotInfo() {
    return this.bot.telegram.getMe();
  }
}
